require 'json'
require 'securerandom'
require 'fileutils'

require_dependency 'version'

class Image
  IMAGE_FOLDER = 'images'
  IMAGES_JSON = 'images.json'
  IMAGE_PATH_PRE_PROJECT_ID = '/api/project/'
  IMAGE_PATH_PRE_IMAGE_ID = '/image/'

  # the images metadata (lazy loaded)
  @metadata = nil
  # the projects id
  @project = nil
  # the images uuid
  @image_id = nil

  def initialize(project, image_id)
    @image_id = image_id
    @project = project
  end

  def id
    @image_id
  end

  def project_id
    @project.id
  end

  def folder
    File.join(@project.folder, IMAGE_FOLDER, @image_id[0..1], @image_id[2..3])
  end

  def path
    File.join(folder, @image_id)
  end

  def image_json
    File.join(@project.folder, IMAGE_FOLDER, IMAGES_JSON)
  end

  def self.image_json(project)
    File.join(project.folder, IMAGE_FOLDER, IMAGES_JSON)
  end

  def exists?
    File.file?(path)
  end

  def file_show
    if self.exists? then
      path
    else
      raise UnknownImageError.new(@project.id, @image_id)
    end
  end

  def file_update!(file)
    if self.exists? then
      FileUtils.mv(file, path)
    else
      raise UnknownImageError.new(project_id, @image_id)
    end
  end

  def file_destroy!
    if self.exists? then
      metadata = JSON.parse(File.read(image_json))

      metadata.except!(@image_id)

      File.write(image_json, (JSON.dump(metadata)))

      File.delete(path)

      #self.freeze
    else
      raise UnknownImageError.new(@project_id, @image_id)
    end
  end

  def metadata_set!(metadata)
    @metadata = metadata
  end

  def self.metadata_get_from_file(project)
    to_return = []
    if File.file?(self.image_json(project))
    then
      JSON.parse(File.read(self.image_json(project))).each do |k, v|
        v['id'] = k
        v['apiVersion'] = current_api_version;
        v['name'] = v['image-name'];
        v.delete 'image-name';
        to_return.append(v)
      end
    end
    to_return
  end

  def metadata_load!
    begin
      @metadata = File.file?(image_json) ? JSON.parse(File.read(image_json)).fetch(@image_id) : Hash.new
    rescue KeyError
      raise UnknownImageError.new(project.id, @image_id)
    end
  end

  def metadata_show
    metadata_load! if @metadata.nil?
    res = @metadata

    res['id'] = @image_id
    res['apiVersion'] = current_api_version;
    res['name'] = res['image-name'];
    res.except!('image-name');

    res
  end

  def metadata_update(metadata)
    metadata_load!
    @metadata.merge!(metadata)
  end

  def metadata_save
    if !@metadata.nil?
      metadata_list = File.file?(image_json) ? JSON.parse(File.read(image_json)) : Hash.new
      metadata_list[@image_id] = @metadata
      File.write(image_json, JSON.dump(metadata_list))
    end
  end

  def self.uuid_to_filename(project, uuid)
    folder = File.join(project.folder, IMAGE_FOLDER)
    File.join(folder, uuid[0..1], uuid[2..3], uuid)
  end

  def self.file_new!(file, project, metadata)
    uuid = SecureRandom.uuid
    while File.file?(self.uuid_to_filename(project, uuid))
      uuid = SecureRandom.uuid
    end

    img = Image.new(project, uuid)
    img.metadata_set!(metadata)

    #needs to be done before saving metadata
    FileUtils.mkdir_p(img.folder)

    img.metadata_save

    FileUtils.mv(file, img.path)
    img
  end

  def self.metadata_create(image_name, author_name, author_url, licence_name, licence_url)
    metadata = Hash.new()

    metadata["image-name"] = image_name
    metadata["author-name"] = author_name
    metadata["author-url"] = author_url
    metadata["licence-name"] = licence_name
    metadata["licence-url"] = licence_url

    metadata
  end

end
