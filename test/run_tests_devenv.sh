#!/bin/bash

PROJECT_NAME='JLP'

echo "Starting ... "
docker-compose --project-name $PROJECT_NAME up &
node ./run_tests.js
TEST_STATUS=$?
docker-compose --project-name $PROJECT_NAME down
echo "Done."

exit $TEST_STATUS
