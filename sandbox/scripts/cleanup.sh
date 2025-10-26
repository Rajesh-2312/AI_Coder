#!/bin/bash

# Sandbox cleanup script
# This script cleans up temporary files and processes

echo "Starting sandbox cleanup..."

# Clean up temporary files older than 1 hour
find ./sandbox/temp -type f -mmin +60 -delete 2>/dev/null

# Clean up empty directories
find ./sandbox/temp -type d -empty -delete 2>/dev/null

# Clean up log files older than 7 days
find ./sandbox/logs -type f -mtime +7 -delete 2>/dev/null

echo "Sandbox cleanup completed"

