#!/bin/bash

echo "Stopping all HandoverKey services..."

# Stop frontend and backend processes
if [ -f .pids ]; then
  for PID in $(cat .pids);
  do
    if ps -p $PID > /dev/null
    then
      echo "Stopping process $PID..."
      kill $PID
    else
      echo "Process $PID not found, likely already stopped."
    fi
  done
  rm .pids
  echo "✓ Frontend and backend processes stopped."
else
  echo "No background processes to stop (no .pids file found)."
fi

# Stop Docker services
docker-compose down

echo "All services stopped."