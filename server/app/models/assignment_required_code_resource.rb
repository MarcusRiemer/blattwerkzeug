class AssignmentRequiredCodeResource < ApplicationRecord
    # Assignment that needs this code resource type 
    belongs_to :assignment

    # Proposed solutions of the students
    has_many :assignment_submitted_code_resources

    # Solution of the request
    belongs_to :solution, class_name: 'CodeResource',  :foreign_key => 'code_resource_id', optional: true

    # A request can contain given code snippets or a whole specification 
    has_one :template, class_name: 'AssignmentTemplateCodeResource',  :foreign_key => 'assignment_template_code_resource_id'

end
