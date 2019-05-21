

class SessionsController < ApplicationController

  def create
    user = User.from_omniauth(request.env["omniauth.auth"])
    session[:user_id] = user.id
    token = JWT.encode(
      {user_id: 10, role: 'user'},
      "HS256"
    )

    puts token
    puts JWT.decode(token, "HS256")
    redirect_to root_url
  end

  def destroy
    session[:user_id] = nil
    redirect_to root_url
  end

  def failure
    redirect_to root_url
  end
end

