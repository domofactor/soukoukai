require 'sinatra/base'
require 'sinatra/r18n'
require 'haml'

class MyApp < Sinatra::Base
  register Sinatra::R18n
  use Rack::Session::Cookie, :key => 'rack.session'

  get '/' do
    haml :index
  end

  get '/lang/:locale' do
    session[:locale] = params[:locale]
    redirect back
  end
end
