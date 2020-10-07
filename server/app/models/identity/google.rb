module Identity
  # The Google provider comes from https://github.com/zquestz/omniauth-google-oauth2
  class Google < Identity
    # This URL is mandated by Google to update
    REFRESH_TOKEN_URL = "https://accounts.google.com/o/oauth2/token"

    scope :find_by_email, ->(email) {
      where("provider_data ->> 'email' = ?", email)
    }

    # Creates a google identity with the given hash and user
    def self.create_with_auth(auth, user)
      new(
        :user => user,
        :uid => auth[:uid],
        :provider => auth[:provider],
        :provider_data => auth[:info].merge({ credentials: auth[:credentials] }),
        :own_data => {}
      )
    end

    # Client side information for the GitHub provider
    def self.client_information
      return ({
        name: "Google",
        url_name: "google_oauth2",
        icon: "fa-google",
        color: "FireBrick"
      })
    end

    # Asks Google whether the token that we currently have is still valid and
    # also retrieve a new access_token.
    def refresh_access_token
      logger.info("Refreshing access_token for Google Identity #{self.id}")

      if (refresh_token)
        begin
          response = RestClient.post(
            REFRESH_TOKEN_URL,
            :grant_type => 'refresh_token',
            :refresh_token => self.refresh_token,
            :client_id => Rails.configuration.sqlino[:auth_provider_keys][:google_id],
            :client_secret => Rails.configuration.sqlino[:auth_provider_keys][:google_secret],
          )
          parsed_response = JSON.parse(response.body)
          sliced_response = parsed_response.slice("access_token", "expires_in")

          # Ensure that google answers with the two datapoints that we actually
          # asked for.
          if (sliced_response.keys.length != 2)
            raise EsqulinoError::UnexpectedLogout.new(
              message: "Malformed response from Google: #{response.body}",
              code: 500
            )
          end

          self.access_token = sliced_response["access_token"]
          self.credentials["expires_at"] = (Time.current + sliced_response["expires_in"]).to_i
        rescue RestClient::BadRequest => err
          # If something went wrong during the request, we have to expect the worst: Google somehow
          # revoked this token and we therefore have to forget about it
          provider_data.delete "credentials"
          save!

          raise EsqulinoError::UnexpectedLogout.new(
            message: "Error refreshing the access token from Google",
            code: 500,
            inner_exception: err
          )
        end
      else
        raise EsqulinoError::UnexpectedLogout.new(
          message: "No server side data to renew from Google",
          code: 500
        )
      end
    end

    # Google tells us whether the mail is valid
    def confirmed?
      return self.provider_data["email_verified"]
    end

    # Google provides the mail in the JSON blob
    def email
      return self.provider_data["email"]
    end

    # The duration that is left of the current token that we have received
    # from Google.
    def access_token_duration
      expires_at = self.provider_data.dig("credentials", "expires_at")
      if expires_at
        return Time.at(expires_at)
      else
        return nil
      end
    end

    def access_token_expired?
      self.access_token_duration.nil? || self.access_token_duration < Time.current
    end

    # The current access token we have from Google
    def access_token
      provider_data.dig("credentials", "token")
    end

    # The current refresh token we have from Google
    def refresh_token
      provider_data.dig("credentials", "refresh_token")
    end

    private

    def access_token=(access_token)
      self.credentials["token"] = access_token
    end
  end
end
