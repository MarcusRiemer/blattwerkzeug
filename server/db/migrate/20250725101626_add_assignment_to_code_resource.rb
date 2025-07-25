class AddAssignmentToCodeResource < ActiveRecord::Migration[7.0]
  def change
    add_column :code_resources, :assignment, :string
  end
end
