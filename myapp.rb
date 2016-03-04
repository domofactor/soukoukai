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

  get '/test' do
    haml :test
  end

  get '/en' do
    session[:locale] = 'en'
    haml :test
  end

  get '/ja' do
    session[:locale] = 'ja'
    haml :test
  end
end
