Soukoukai::App.controllers :admin do
  get :index, :map => "/admin" do
    render "admin/index"
  end
end
