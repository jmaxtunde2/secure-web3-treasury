deployment
forge script script/Deploy.s.sol:Deploy   --rpc-url http://127.0.0.1:8545   --broadcast   --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

curl -i -X POST   http://127.0.0.1:3000/proposals   -H "Content-Type: application/json"   -H "x-api-key:dev-admin-key-change-me"   -d '{"to":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","value":"0","data":"0x"}'

curl -i -X POST \
  http://127.0.0.1:3000/proposals/0/verify-signature \
  -H "Content-Type: application/json" \
  -H "x-api-key:dev-admin-key-change-me" \
  -d '{"signature":"0x5d5070d9a62bb3fe8e7e1c20c6411d0505cb8666e7f9a9f2849d832b3e64ff6038a9884648f0bfd6812b943c91dca3cb19afa2dba7aa80ad3c188e06a09689bc1b"}'

  curl -s   http://127.0.0.1:3000/proposals/0   -H "x-api-key:dev-admin-key-change-me"

  curl -i -X POST   http://127.0.0.1:3000/proposals/0/approve   -H "x-api-key:dev-admin-key-change-me"


  curl -i -X POST \
  http://127.0.0.1:3000/proposals/0/execute \
  -H "Content-Type: application/json" \
  -H "x-api-key:dev-admin-key-change-me" \
  -d '{
    "signatures": [
      "0x7e2df0da2fcaeff8a1f0c66592f4b85147d765949948f0d9390946e7d070eacb413f5c3084e2d07ef211c209ee90042cb6ea731a805887f39bdf67c7e867394b1b",
      "0x5d5070d9a62bb3fe8e7e1c20c6411d0505cb8666e7f9a9f2849d832b3e64ff6038a9884648f0bfd6812b943c91dca3cb19afa2dba7aa80ad3c188e06a09689bc1b"
    ]
  }'