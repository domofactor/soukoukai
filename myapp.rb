require 'sinatra/base'
require 'sinatra/r18n'
require 'haml'

class MyApp < Sinatra::Base
  register Sinatra::R18n

  before do
    session[:locale] = params[:locale] if params[:locale]
  end

  get '/' do
    haml :index
  end

  get '/:locale' do
    haml :test
  end
end
