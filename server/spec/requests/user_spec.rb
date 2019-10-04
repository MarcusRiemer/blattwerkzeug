
require 'rails_helper'

RSpec.describe "user controller" do
  json_headers = { "CONTENT_TYPE" => "application/json" }

  before(:each) { create(:user, :guest) }

  describe "getting user description" do
    it "logged in" do
      user = create(:user)
      set_acces_token(user)

      get '/api/user'

      json_data = JSON.parse(response.body)
      expect(json_data["roles"]).to eq(["user"])
    end

    it 'logged out' do
      get '/api/user'

      json_data = JSON.parse(response.body)
      expect(json_data["roles"]).to eq(["guest"])
    end

    it "acces token expired" do
      user = create(:user)
      set_expired_acces_token()

      get '/api/user'
      json_data = JSON.parse(response.body)
      aggregate_failures "testing changes and response" do
        expect(json_data["userId"]).to eq(User.guest_id)
        expect(json_data["displayName"]).to eq("Guest")
        expect(response.status).to eq(200)
      end
    end
  end

  describe "changing primary e-mail" do
    it 'logged in' do
      identity = create(:identity_provider, :existing)
      identity2 = create(:identity_provider, :another_existing, user_id: identity.user_id)

      identity.user.email = identity.uid
      identity.user.save!

      set_acces_token(identity.user)
      expect(User.find(identity.user_id).email).to eq(identity.uid)

      post '/api/user/send_change_email',
        :headers => json_headers,
        :params => {
          primaryEmail: identity2.uid
        }.to_json

      expect(response.status).to eq(200)

      updated_identity = Identity.find_by(id: identity2.id)

      get "/api/user/change_primary_email/#{updated_identity.change_primary_email_token}"
      expect(User.find(identity.user_id).email).to eq(identity2.uid)
    end

    context "invalid" do
      let!(:identity) { create(:identity_provider, :existing) }

      it 'logged out' do
        post '/api/user/send_change_email',
          :headers => json_headers,
          :params => {
            primaryEmail: "test@web.de"
          }.to_json

        expect(response.status).to eq(401)
      end

      it 'unconfirmed email' do
        identity2 = create(:identity_provider, :new, uid: "another@web.de", user_id: identity.user_id)

        identity.user.email = identity.uid
        identity.user.save!

        set_acces_token(identity.user)
        expect(User.find(identity.user_id).email).to eq(identity.uid)

        post '/api/user/send_change_email',
          :headers => json_headers,
          :params => {
            primaryEmail: identity2.uid
          }.to_json

        expect(response.status).to eq(401)
        expect(User.find(identity.user_id).email).not_to eq(identity2.uid)
      end

      it 'not existing email' do
        identity2 = create(:identity_provider, :new, uid: "another@web.de", user_id: identity.user_id)

        identity.user.email = identity.uid
        identity.user.save!

        set_acces_token(identity.user)
        expect(User.find_by(id: identity.user_id)[:email]).to eq(identity.uid)

        post '/api/user/send_change_email',
          :headers => json_headers,
          :params => {
            primaryEmail: "not_existing@web.de"
          }.to_json

        expect(response.status).to eq(401)
        expect(User.find_by(id: identity.user_id)[:email]).to eq(identity.uid)
      end

      it 'invalid token' do
        identity2 = create(:identity_provider, :another_existing)

        identity.user.email = identity.uid
        identity.user.save!

        set_acces_token(identity.user)
        expect(User.find_by(id: identity.user_id)[:email]).to eq(identity.uid)

        post '/api/user/send_change_email',
          :headers => json_headers,
          :params => {
            primaryEmail: identity2.uid
          }.to_json

        get "/api/user/change_primary_email/invalid"
        expect(User.find_by(id: identity.user_id)[:email]).to eq(identity.uid)
        expect(response.status).to eq(401)
      end

      it 'expired token' do
        identity2 = create(:identity_provider, :another_existing)

        identity.user.email = identity.uid
        identity.user.save!

        set_acces_token(identity.user)
        expect(User.find_by(id: identity.user_id)[:email]).to eq(identity.uid)

        post '/api/user/send_change_email',
          :headers => json_headers,
          :params => {
            primaryEmail: identity2.uid
          }.to_json

        expired = Identity.find_by(uid: identity2.uid)
        expired.set_primary_email_token_expired
        expired.save!

        get "/api/user/change_primary_email/invalid"
        expect(User.find_by(id: identity.user_id).email).to eq(identity.uid)
        expect(response.status).to eq(401)
      end
    end
  end

  describe "changing username" do
    let!(:identity) { create(:identity_provider, :existing) }

    it "valid" do
      set_acces_token(identity.user)
      expect(User.find_by(id: identity.user_id)[:display_name]).to eq("Blattwerkzeug")

      patch '/api/user/change_username',
        :headers => json_headers,
        :params => {
          displayName: "New name"
        }.to_json
      
      aggregate_failures "testing changes and response" do
        expect(User.find_by(id: identity.user_id)[:display_name]).to eq("New name")
        expect(response.status).to eq(200)
      end
    end

    it "invalid (empty string)" do
      set_acces_token(identity.user)
      expect(User.find_by(id: identity.user_id)[:display_name]).to eq("Blattwerkzeug")

      patch '/api/user/change_username',
        :headers => json_headers,
        :params => {
          displayName: ""
        }.to_json

      expect(User.find_by(id: identity.user_id)[:display_name]).to eq("Blattwerkzeug")
    end
  end

  describe "user may-perform" do
    let!(:identity) { create(:identity_provider, :existing) }

    it "multiple objects" do
      set_acces_token(identity.user)

      post '/api/user/may_perform',
        :headers => json_headers,
        :params => {
          list: [
            {
              resourceType: "News",
              policyAction: "create"
            },
            {
              resourceType: "Project",
              policyAction: "create"
            }
          ]
        }.to_json

      json_data = JSON.parse(response.body)
      expect(json_data).to eq([{"perform" => false}, {"perform" => true}])
    end
  end
end