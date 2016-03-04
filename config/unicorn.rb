# set path to app that will be used to configure unicorn,
# note the trailing slash in this example
@dir = "/"

worker_processes 2
#working_directory @dir
working_directory '/root/soukoukai'

timeout 30

# Specify path to socket unicorn listens to,
# we will use this in our nginx.conf later
#listen "#{@dir}tmp/sockets/unicorn.sock", :backlog => 64
listen 8080

# Set process id path
pid "#{@dir}tmp/pids/unicorn.pid"

# Set log file paths
#stderr_path "#{@dir}log/unicorn.stderr.log"
#stderr_path "#{@dir}log/unicorn.stderr.log"
stdout_path "/tmp/log/unicorn.stdout.log"
stdout_path "/tmp/log/unicorn.stdout.log"
