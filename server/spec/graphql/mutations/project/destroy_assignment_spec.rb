require "rails_helper"

RSpec.describe Mutations::Projects::DestroyAssignment do

  # These specs relies on
  # * an existing guest user
  before(:each) {
    create(:user, :guest)
  }

  def init_args(user: User.guest)
    {
      context: {
        user: user
      },
      object: nil,
      field: nil,
    }
  end

  it "destroy assignment normal work" do
    current_user_owner = create(:user, display_name: "Owner")
    project = create(:project, user: current_user_owner, public: false)

    assignment = create(:assignment, project_id: project.id)
    
    expect( Assignment.count ).to eq 1

    mut = described_class.new(**init_args(user: current_user_owner))
    res = mut.resolve(
        id: assignment.id
    )

    expect( Assignment.count ).to eq 0

  end

  it "dont destroy assignment with assingments_submissions" do
    current_user_owner = create(:user, display_name: "Owner")
    project = create(:project, user: current_user_owner, public: false)

    assignment = create(:assignment, project_id: project.id)
    create(:assignment_submission, assignment_id: assignment.id)
    create(:assignment_submission, assignment_id: assignment.id)

    expect( Assignment.count ).to eq 1
    expect( Assignment.count ).to eq 1

    mut = described_class.new(**init_args(user: current_user_owner))
    expect{mut.resolve(
        id: assignment.id
    )}.to raise_error(ArgumentError)

    expect( Assignment.count ).to eq 1
    
  end

  it " destroy assignment with no permissions" do
    current_user_owner = create(:user, display_name: "Owner")
    project = create(:project, user: current_user_owner, public: false)

    user = create(:user)

    assignment = create(:assignment, project_id: project.id)
    create(:assignment_submission, assignment_id: assignment.id)

    expect( Assignment.count ).to eq 1

    mut = described_class.new(**init_args(user: user))
    expect{mut.resolve(
        id: assignment.id
    )}.to raise_error(Pundit::NotAuthorizedError)

    expect( Assignment.count ).to eq 1
  end

  it " destroy assignment with  all the required code resources" do
    current_user_owner = create(:user, display_name: "Owner")
    project = create(:project, user: current_user_owner, public: false)

    block = create(:block_language)
    block2 = create(:block_language)
    block3 = create(:block_language)
    
    project.block_languages = [ block, block2, block3 ]

    project.save!
    assignment = create(:assignment, project_id: project.id)
    
    create(:assignment_required_code_resource, assignment_id: assignment.id, programming_language: block.default_programming_language)
    create(:assignment_required_code_resource, assignment_id: assignment.id, programming_language: block2.default_programming_language)
    create(:assignment_required_code_resource, assignment_id: assignment.id, programming_language: block3.default_programming_language)
    
    expect( Assignment.count ).to eq 1
    expect( AssignmentRequiredCodeResource.count ).to eq 3

    mut = described_class.new(**init_args(user: current_user_owner))
    res = mut.resolve(
        id: assignment.id
    )

    expect( Assignment.count ).to eq 0
    expect( AssignmentRequiredCodeResource.count ).to eq 0
  end



end