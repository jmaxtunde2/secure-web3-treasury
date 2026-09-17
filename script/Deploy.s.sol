// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Script} from "forge-std/Script.sol";
import {SecureTreasury} from "../src/SecureTreasury.sol";

contract Deploy is Script {
    function run() external returns (SecureTreasury treasury) {
       address[] memory signers = new address[](3);

        signers[0] = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        signers[1] = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
        signers[2] = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;

        uint256 threshold = 2;

        vm.startBroadcast();
         treasury = new SecureTreasury(
            signers,
            threshold
        );

        vm.stopBroadcast();
      
    }
}