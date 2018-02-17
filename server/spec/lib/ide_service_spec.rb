require 'rails_helper'

require_dependency 'ide_service'

RSpec.describe "IDE Service" do

  # Retrieves the "actual" test configuration for the "exec" mode.
  # This will normally be ignored during testing but is relevant if
  # we want to test the *actual* communication.
  def exec_configuration
    Rails.configuration.sqlino['ide_service']['exec']
  end

  context "OneShot" do
    it "responds to ping" do
      service = OneShotExecIdeService.new(config: exec_configuration)
      expect(service.ping!).to be true
    end

    it "emits SQL source code" do
      service = OneShotExecIdeService.new(config: exec_configuration)

      tree_desc = {
        "language" => "sql",
        "name" => "starOperator"
      }

      expect(service.emit_code(tree_desc, "sql")).to eq "*"
    end
  end

  context "initialization" do
    it "creates a OneShot instance" do
      service = IdeService.instantiate(service_config: { "exec" => { "mode" => "one-shot" } })
      expect(service.class).to be OneShotExecIdeService
    end

    it "mocking has precedence" do
      service = IdeService.instantiate(service_config: { "mock" => true, "exec" => { "mode" => "one-shot" } })
      expect(service.class).to be MockIdeService
    end

    it "missing modes are an error" do
      expect { IdeService.instantiate(service_config: { }) }.to raise_exception IdeServiceError
    end
  end
end
