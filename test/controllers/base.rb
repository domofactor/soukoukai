Soukoukai::Test.controllers :test do
  get :index, :map => "/" do
    'Test'
  end
end
