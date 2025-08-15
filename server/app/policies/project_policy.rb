class ProjectPolicy < ApplicationPolicy
  attr_reader :user, :project

  def initialize(user, project)
    @user = user
    @project = project
  end

  def create?
    user.has_role?(:validated) || user.has_role?(:admin)
  end

  def update?
    user.owner_of?(project) || user.has_role?(:admin)
  end

  def destroy?
    user.owner_of?(project) || user.has_role?(:admin)
  end

  # May the user add a code resource in this project?
  def create_code_resource?
    user.owner_of?(project) || user.has_role?(:admin)
  end

  def educational?
    user.has_role?(:admin)
  end

  def ai_hint?
    true
  end

  # May the user persist the current state of the project to the seed data?
  # If this is permitted, the stored data may end up in git.
  def store_seed?
    user.has_role?(:admin)
  end

  def add_member?
    permitted_roles = ["admin", "owner"]
    user_role = project.member_role(user)

    return user.has_role?(:admin) || project.user_have_role(user,permitted_roles) || project.public && user_role=="participant"
  end

  def change_member_role?
    permitted_roles = ["admin", "owner"]

    return project.user_have_role(user,permitted_roles)
  end


  def remove_member?
    permitted_roles = ["admin", "owner", "participant"]

    return project.user_have_role(user,permitted_roles)
  end

  def change_owner?
    permitted_roles = ["owner"]

    return project.user_have_role(user,permitted_roles)
  end
end
