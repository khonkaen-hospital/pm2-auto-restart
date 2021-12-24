username="www"
IPS=(
  "192.168.0.86:/app_data/api/crontab"
  )
for IP in "${IPS[@]}"
do
  echo "copy to server => $IP/app "
  scp -r src/* $username@$IP/app

  echo "copy json to server => $IP "
  scp *.json $username@$IP

  scp auto_reload $username@$IP
done


EndTime=$(date +"%d-%m-%Y %H:%M:%S")
echo ">>> completed: $EndTime"
