class Github < Identity
  def self.create_with_auth(auth, user)
    auth[:info]["confirmed"] = true

    Github.create(:user => user, :uid => auth[:uid], :provider => auth[:provider], :data => auth[:info])
  end
end