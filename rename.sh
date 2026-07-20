#!/bin/bash

# Check if there are any .jade files to prevent errors
shopt -s nullglob
files=(*.jade)

if [ ${#files[@]} -eq 0 ]; then
    echo "No .jade files found in the current directory."
    exit 0
fi

# Loop through and rename
for file in "${files[@]}"; do
    new_name="${file%.jade}.pug"
    mv "$file" "$new_name"
    echo "Renamed: $file -> $new_name"
done

echo "All done!"
