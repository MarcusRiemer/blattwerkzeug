# Setting up various paths as part of the configuration
Rails.application.config.to_prepare do
  config = Rails.application.config
  config.sqlino = Rails.application.config_for :sqlino
  
  # Turn client_dir and data_dir into absolute paths
  config.sqlino[:client_dir] = Rails.root.join(Rails.configuration.sqlino['client_dir'])
  config.sqlino[:data_dir] = Rails.root.join(Rails.configuration.sqlino['data_dir'])
  
  config.sqlino[:projects_dir] = config.sqlino[:data_dir].join 'projects'
end

# Setting up the IDE service
Rails.application.config.after_initialize do
  Rails.logger.info "Configuring IDE Service ..."
  IdeService.instantiate

  IdeService::LogSubscriber.attach_to :ide_service

  Rails.logger.info "IDE service configured, testing availability ..."
  IdeService.instance.ping!
end
