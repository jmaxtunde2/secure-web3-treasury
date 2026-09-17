// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Script} from "forge-std/Script.sol";
import {SecureTreasury} from "../src/SecureTreasury.sol";

contract Deploy is Script {
    function run() external returns (SecureTreasury treasury) {
       address[] memory signers = new address[](3);

        signers[0] = vm.addr(1);
        signers[1] = vm.addr(2);
        signers[2] = vm.addr(3);

        uint256 threshold = 2;

        vm.startBroadcast();
         treasury = new SecureTreasury(
            signers,
            threshold
        );

        vm.stopBroadcast();
      
    }
}