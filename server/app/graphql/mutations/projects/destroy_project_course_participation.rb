class Mutations::Projects::DestroyProjectCourseParticipation < Mutations::Projects::Projects
  argument :group_id, ID, required: true
  field :project, Types::ProjectType, null: true
  def resolve(group_id:)
    group = Project.find_by_slug_or_id!(group_id)

    raise ArgumentError, 'The Project must be a group of a course.' if group.based_on_project.nil?

    course = Project.find(group.based_on_project.id)

    raise ArgumentError, 'Can´t delete a Group with submissions' if group.assignment_submissions.count > 0

    authorize course, :destroy_project_course_participation?

    group.destroy!

    {
      project: course
    }
  end
end
