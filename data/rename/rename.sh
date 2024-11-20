find . -type f -name '*EPSG6676.*' | while read filepath; do
  dirname=$(dirname "$filepath")
  filename=$(basename "$filepath")
  newname=$(echo "$filename" | sed 's/EPSG6676//')
  mv "$filepath" "$dirname/$newname"
done
