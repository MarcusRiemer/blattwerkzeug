class NewsController < ApplicationController
  include LocaleHelper
  
  def index
    locale = request_locale
    render :json => News.scope_single_language(locale).map{|l| l.to_list_api_response}  
  end

  def show
    locale = request_locale
    render :json => News.scope_single_language(locale)
                      .where("id = ?", params[:id])
                      .first
                      .to_list_api_response
  end

  def index_admin
    render :json => News.all.map{|l| l.to_full_api_response}
  end

  def show_admin
    render :json => News.all
                      .find_by(id: params[:id])
                      .to_full_api_response
  end

  def update
    news = News.all.find_by(id: params[:id])
    transformed_data = params_updated_news
    begin
      transformed_data[:published_from] = parse_date(transformed_data[:published_from])
      news.update(transformed_data)

      render :json => news.to_full_api_response
    rescue ArgumentError => e
      render status: 400, :json => news.to_full_api_response
    end
  end

  def create_news
    transformed_data = params_updated_news
    begin
      transformed_data[:published_from] = parse_date(transformed_data[:published_from])
      news = News.create(transformed_data)

      render :json => news.to_full_api_response
    rescue ArgumentError => e
      render status: 400
    end
  end

  def delete_news
    news = News.all.find_by(id: params[:id])
    if (news)
      news.destroy
    else
      render status: 400
    end
  end

  def params_updated_news
    params.permit(:publishedFrom, title: [:de, :en], text: [:de, :en])
      .transform_keys { |k| k.underscore }
  end

  def parse_date(date_str)
    Date.parse(date_str)
  rescue ArgumentError => e
    raise ArgumentError.new("Error: #{e} invalid date")
  end
  
end