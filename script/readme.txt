local deployemnt deployment and test
forge script script/Deploy.s.sol:Deploy   --rpc-url http://127.0.0.1:8545   --broadcast   --private-key ---

curl -i -X POST   http://127.0.0.1:3000/proposals   -H "Content-Type: application/json"   -H "x-api-key:dev-admin-key-change-me"   -d '{"to":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","value":"0","data":"0x"}'

curl -i -X POST \
  http://127.0.0.1:3000/proposals/0/verify-signature \
  -H "Content-Type: application/json" \
  -H "x-api-key:dev-admin-key-change-me" \
  -d '{"signature":"--"}'

  curl -s   http://127.0.0.1:3000/proposals/0   -H "x-api-key:dev-admin-key-change-me"

  curl -i -X POST   http://127.0.0.1:3000/proposals/0/approve   -H "x-api-key:dev-admin-key-change-me"


  curl -i -X POST \
  http://127.0.0.1:3000/proposals/0/execute \
  -H "Content-Type: application/json" \
  -H "x-api-key:dev-admin-key-change-me" \
  -d '{
    "signatures": [
      "--",
      "--"
    ]
  }'



  forge script script/Deploy.s.sol:Deploy   --rpc-url https://ethereum-sepolia-rpc.publicnode.com  --broadcast   --private-key 
