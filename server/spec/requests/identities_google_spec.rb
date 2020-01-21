require 'rails_helper'

RSpec.describe "identities controller (with Google Identity)" do
  json_headers = { "CONTENT_TYPE" => "application/json" }

  describe "GET /api/user" do
    it "access_token expired, no refresh_token" do
      # This test must fall back to the guest user
      create(:user, :guest)

      user_identity = create(:google_provider, :existing)
      user = user_identity.user
      cookies['ACCESS_TOKEN'] = JwtHelper.encode({
                                                   "user_id" => user.id
                                                 }, 300.seconds.before)

      get '/api/user'
      body = JSON.parse(response.body)

      aggregate_failures do
        expect(response).to have_http_status(400)
        expect(body["type"]).to eq "EsqulinoError::UnexpectedLogout"
        expect(response.cookies.keys).not_to include("REFRESH_TOKEN")
        expect(response.cookies["ACCESS_TOKEN"]).to be nil
      end
    end

    it "access_token expired, refresh_token not expired" do
      user_identity = create(:google_provider, :existing)
      user = user_identity.user
      cookies['ACCESS_TOKEN'] = JwtHelper.encode({
                                                   "user_id" => user.id
                                                 }, 300.seconds.before)

      cookies['REFRESH_TOKEN'] = JwtHelper.encode({
                                                    "user_id" => user.id,
                                                    "identity_id" => user_identity.id,
                                                    "exp" => 300.seconds.after,
                                                    "iss": "localhost.localdomain:9292"
                                                  })

      get '/api/user'
      body = JSON.parse(response.body)

      aggregate_failures do
        expect(response).to have_http_status(200)
        expect(body).to include("userId" => user.id, "displayName" => user.display_name)
        expect(response.cookies.keys).to include("ACCESS_TOKEN")
      end
    end

    it "access_token expired, refresh_token expired but googles token still valid" do
      user_identity = create(:google_provider, :existing)
      user = user_identity.user
      cookies['ACCESS_TOKEN'] = JwtHelper.encode({
                                                   "user_id" => user.id
                                                 }, 300.seconds.before)

      cookies['REFRESH_TOKEN'] = JwtHelper.encode({
                                                    "user_id" => user.id,
                                                    "identity_id" => user_identity.id,
                                                    "exp" => 300.seconds.after,
                                                    "iss": "localhost.localdomain:9292"
                                                  }, 300.seconds.before)

      get '/api/user'
      body = JSON.parse(response.body)

      aggregate_failures do
        expect(response).to have_http_status(200)
        expect(body).to include("userId" => user.id, "displayName" => user.display_name)
        expect(response.cookies.keys).to include("ACCESS_TOKEN", "REFRESH_TOKEN")
      end
    end

    it "access_token expired, refresh_token expired and googles token expired (but can be renewed)" do
      user_identity = create(:google_provider, :expired)
      user = user_identity.user
      cookies['ACCESS_TOKEN'] = JwtHelper.encode({
                                                   "user_id" => user.id
                                                 }, 300.seconds.before)

      cookies['REFRESH_TOKEN'] = JwtHelper.encode({
                                                    "user_id" => user.id,
                                                    "identity_id" => user_identity.id,
                                                    "exp" => 180.seconds.before,
                                                    "iss": "localhost.localdomain:9292"
                                                  }, 60.seconds.before)

      # Renewal of refresh token requires roundtrip to Google
      refresh_response = {
        "access_token"=>"new_secret",
        "expires_in"=>3261,
        "scope"=>"https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
        "token_type"=>"Bearer",
        "id_token"=>"secret"
      }.to_json

      stub_request(:post, "https://accounts.google.com/o/oauth2/token")
        .to_return(status: 200, body: refresh_response, headers: {})

      get '/api/user'
      body = JSON.parse(response.body)

      aggregate_failures do
        expect(response).to have_http_status(200)
        expect(body).to include("userId" => user.id, "displayName" => user.display_name)
        expect(response.cookies.keys).to include("ACCESS_TOKEN", "REFRESH_TOKEN")
      end
    end

    it "access_token expired, refresh_token expired and googles token expired (and can't be renewed)" do
      user_identity = create(:google_provider, :expired)
      user = user_identity.user
      cookies['ACCESS_TOKEN'] = JwtHelper.encode({
                                                   "user_id" => user.id
                                                 }, 300.seconds.before)

      cookies['REFRESH_TOKEN'] = JwtHelper.encode({
                                                    "user_id" => user.id,
                                                    "identity_id" => user_identity.id,
                                                    "exp" => 180.seconds.before,
                                                    "iss": "localhost.localdomain:9292"
                                                  }, 240.seconds.before)

      # Renewal of refresh token requires roundtrip to Google, but this fails
      stub_request(:post, "https://accounts.google.com/o/oauth2/token")
        .to_return(status: 400, body: "", headers: {})

      get '/api/user'
      body = JSON.parse(response.body)

      aggregate_failures do
        expect(response).to have_http_status(500)
        expect(body["type"]).to eq "EsqulinoError::UnexpectedLogout"
        expect(response.cookies.keys).not_to include("ACCESS_TOKEN", "REFRESH_TOKEN")
      end
    end

    it "access_token expired, refresh_token expired and no renewal credentials from Google" do
      user_identity = create(:google_provider, :no_renew_credentials)
      user = user_identity.user
      cookies['ACCESS_TOKEN'] = JwtHelper.encode({
                                                   "user_id" => user.id
                                                 }, 300.seconds.before)

      cookies['REFRESH_TOKEN'] = JwtHelper.encode({
                                                    "user_id" => user.id,
                                                    "identity_id" => user_identity.id,
                                                    "exp" => 180.seconds.before,
                                                    "iss": "localhost.localdomain:9292"
                                                  }, 240.seconds.before)

      # Renewal of refresh token requires roundtrip to Google, but no attempt must be made!
      get '/api/user'
      body = JSON.parse(response.body)

      aggregate_failures do
        expect(response).to have_http_status(500)
        expect(body["type"]).to eq "EsqulinoError::UnexpectedLogout"
        expect(response.cookies.keys).not_to include("ACCESS_TOKEN", "REFRESH_TOKEN")
      end
    end
  end

  describe "GET /api/auth/google_oauth2/callback" do
    # A successful response as it could be parsed from Google
    let (:default_google_auth_hash) {
      OmniAuth::AuthHash.new(
        {
          "provider"=>"google_oauth2",
          "uid"=>"1234567890",
          "info"=> {
            "name"=>"Some Body",
            "email"=>"somebody@gmail.com",
            "email_verified"=>true,
            "first_name"=>"Some",
            "last_name"=>"Body",
            "image"=>"https://lh3.googleusercontent.com/a-/invalid"
          },
          "credentials"=> {
            "token"=> "first_google_auth_token",
            "expires_at"=> 300.seconds.after.to_i,
            "expires"=>true
          },
        }
      )
    }


    before(:all) do
      OmniAuth.config.test_mode = true
    end

    after(:all) do
      OmniAuth.config.test_mode = false
    end

    xit"first login of new user" do
      expect(Identity::Google.count).to eq 0

      get '/api/auth/google_oauth2'

      expect(response.redirect_url).to include('/api/auth/google_oauth2/callback')

      OmniAuth.config.mock_auth[:google_oauth2] = default_google_auth_hash
      Rails.application.env_config["omniauth.auth"]= default_google_auth_hash

      get response.redirect_url

      expect(response).to have_http_status(200)

      expect(Identity::Google.count).to eq 1
    end
  end
end