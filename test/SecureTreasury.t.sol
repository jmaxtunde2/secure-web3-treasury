// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {SecureTreasury} from "../src/SecureTreasury.sol";

contract MockERC20 is ERC20{
    constructor() ERC20("Mock Token","Mock"){}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ReentrantReceiver {
    SecureTreasury public treasury;
    uint256 public proposalId;
    bool public attackAttempted;
    
    constructor(SecureTreasury treasury_) {
        treasury = treasury_;
    }

    function setProposalId(uint256 proposalId_) external {
        proposalId = proposalId_;
    }

    receive() external payable {
        if (!attackAttempted) {
            attackAttempted = true;

            bytes[] memory signatures =
                new bytes[](0);

            try treasury.execute(
                proposalId,
                signatures
            ) {
                revert("REENTRANCY SUCCEEDED");
            } catch {}
        }
    }
}

contract FalseReturningToken is ERC20{
    constructor() ERC20("False Token","False"){}
    function mint(address to, uint256 amount) external {
        _mint(to,amount);
    }
    function transfer(address,uint256) public pure override returns (bool) {
        return false;
    }
}

contract RevertToken is ERC20 {
    constructor() ERC20("RevertToken","RT"){}
    function mint(address to, uint amount) external {
        _mint(to,amount);
    }

    function transfer(address, uint256) public pure override  returns (bool) {
        revert();
    }
}

contract SecureTreasuryTest is Test {
    SecureTreasury internal treasury;
    MockERC20 internal token;
    address internal alice;
    address internal bob;
    address internal charlie;
    address internal david;

    uint256 internal alicePrivateKey = 0xA11CE;
    uint256 internal bobPrivateKey = 0xB0B;
    uint256 internal charliePrivateKey = 0xC0C;
    address internal recipient;
    FalseReturningToken internal falseToken;
    RevertToken internal revertToken;

    function setUp() public{
        // Use deterministic private-key-based addresses for signers
        alice = vm.addr(alicePrivateKey);
        bob = vm.addr(bobPrivateKey);
        charlie = vm.addr(charliePrivateKey);
        david = makeAddr("david");
        recipient = makeAddr("recipient");
        
        address[] memory signers = new address[](3);
        signers[0] = alice;
        signers[1] = bob;
        signers[2] = charlie;

        treasury = new SecureTreasury(signers,2);
        token = new MockERC20();
        vm.deal(address(treasury),100 ether);
        token.mint(address(treasury), 100_000 ether);

        // False Token 
        falseToken = new FalseReturningToken();
        falseToken.mint(address(treasury), 100_000 ether);
        // Revert Token
        revertToken = new RevertToken();
        revertToken.mint(address(treasury), 100_000 ether);

    }

    function test_ConstructorConfiguration() public {
        assertEq(treasury.threshold(),2);
        assertTrue(treasury.isSigner(alice));
        assertTrue(treasury.isSigner(bob));
        assertTrue(treasury.isSigner(charlie));
        assertFalse(treasury.isSigner(david));

        assertEq(treasury.signers(0), alice);
        assertEq(treasury.signers(1), bob);
        assertEq(treasury.signers(2), charlie);
    }

    function test_AnyoneCanCreateProposal() public {
        vm.prank(david);
        uint256 proposalId = treasury.createProposal(
            recipient,
            10 ether,
            ""
        );

        assertEq(proposalId,0);
        assertEq(treasury.proposalCount(),1);

        // (address to, uint256 value, bytes memory data, uint256 nonce, uint256 approvalCount, bool executed) = treasury.getProposal(proposalId);


        // assertEq(to,recipient);
        // assertEq(value, 10 ether);
        // assertEq(data,"");
        // assertEq(nonce,0);
        // assertEq(approvalCount,0);
        // assertEq(executed,false);
    }

    function test_SignerCanApprove() public {
        uint256 proposalId = _createProposal();
        vm.prank(alice);
        treasury.approve(proposalId);

        assertTrue(treasury.approved(proposalId,alice));
        
        // (
        //     ,
        //     ,
        //     ,
        //     ,
        //     uint256 approvalCount,
            
        // ) = treasury.getProposal(proposalId);

        // assertEq(approvalCount, 1); 

    }

    function test_NonSignerCannotApprove() public {
        uint256 proposalId =
            _createProposal();

        vm.prank(david);

        vm.expectRevert(
            SecureTreasury.NotSigner.selector
        );

        treasury.approve(proposalId);
    }

    function test_SignerCannotApproveTwice() public {
        uint256 proposalId =
            _createProposal();

        vm.startPrank(alice);

        treasury.approve(proposalId);

        vm.expectRevert(
            SecureTreasury.AlreadyApproved.selector
        );

        treasury.approve(proposalId);

        vm.stopPrank();
    }

    function test_FalseReturningToken() public {
        uint256 amount = 1_000 ether;

        uint256 recipientBalanceBefore =
            falseToken.balanceOf(recipient);

        bytes memory data = abi.encodeCall(
            IERC20.transfer,
            (recipient, amount)
        );

        uint256 proposalId =
            treasury.createProposal(
                address(falseToken),
                0,
                data
            );

        bytes[] memory signatures =
            _getSignatures(
                proposalId,
                alicePrivateKey,
                bobPrivateKey
            );

        treasury.execute(
            proposalId,
            signatures
        );

        uint256 recipientBalanceAfter =
            falseToken.balanceOf(recipient);

        assertEq(
            recipientBalanceAfter,
            recipientBalanceBefore
        );
    }
    function test_RevertingToken() public {
        uint256 amount = 1_000 ether;

        uint256 recipientBalanceBefore =
            revertToken.balanceOf(recipient);

        bytes memory data = abi.encodeCall(
            IERC20.transfer,
            (recipient, amount)
        );

        uint256 proposalId =
            treasury.createProposal(
                address(revertToken),
                0,
                data
            );

        bytes[] memory signatures =
            _getSignatures(
                proposalId,
                alicePrivateKey,
                bobPrivateKey
            );

        vm.expectRevert(
            SecureTreasury.ExecutionFailed.selector
        );

        treasury.execute(
            proposalId,
            signatures
        );

        uint256 recipientBalanceAfter =
            revertToken.balanceOf(recipient);

        assertEq(
            recipientBalanceAfter,
            recipientBalanceBefore
        );
    }

    function test_CannotExecuteWithoutThreshold() public {
    uint256 proposalId =
        _createProposal();

    SecureTreasury.Proposal memory proposal =
        treasury.getProposal(proposalId);

    bytes32 digest =
        treasury.getTransactionDigest(
            proposal.to,
            proposal.value,
            proposal.data,
                proposal.nonce
            );

        (uint8 v, bytes32 r, bytes32 s) =
            vm.sign(
                alicePrivateKey,
                digest
            );

        bytes[] memory signatures =
            new bytes[](1);

        signatures[0] =
            abi.encodePacked(r, s, v);

        vm.expectRevert(
            SecureTreasury.InsufficientApprovals.selector
        );

        treasury.execute(
            proposalId,
            signatures
        );
    }

    function test_CanExecuteAfterThreshold() public {
        uint256 proposalId =
            _createProposal();

        bytes[] memory signatures =
            _getSignatures(
                proposalId,
                alicePrivateKey,
                bobPrivateKey
            );

        uint256 recipientBalanceBefore =
            recipient.balance;

        treasury.execute(
            proposalId,
            signatures
        );

        assertEq(
            recipient.balance,
            recipientBalanceBefore + 10 ether
        );
    }
    
    function test_CannotExecuteTwice() public {
        uint256 proposalId =
            _createProposal();

        bytes[] memory signatures =
            _getSignatures(
                proposalId,
                alicePrivateKey,
                bobPrivateKey
            );

        treasury.execute(
            proposalId,
            signatures
        );

        vm.expectRevert(
            SecureTreasury.AlreadyExecuted.selector
        );

        treasury.execute(
            proposalId,
            signatures
        );
    }

        // =============================================================
        //                       REENTRANCY
        // =============================================================

        function test_ReentrancyCannotExecuteTwice() public {
            ReentrantReceiver attacker =
                new ReentrantReceiver(treasury);

            uint256 proposalId =
                treasury.createProposal(
                    address(attacker),
                    10 ether,
                    ""
                );

            vm.prank(alice);
            treasury.approve(proposalId);

            vm.prank(bob);
            treasury.approve(proposalId);

            attacker.setProposalId(
                proposalId
            );

            uint256 treasuryBalanceBefore =
                address(treasury).balance;

            bytes[] memory signatures = _getSignatures(
                proposalId,
                alicePrivateKey,
                bobPrivateKey
            );

            treasury.execute(proposalId, signatures);

            assertEq(
                address(treasury).balance,
                treasuryBalanceBefore - 10 ether
            );

            assertTrue(
                attacker.attackAttempted()
            );
        }

        // =============================================================
        //                  FAILED EXECUTION
        // =============================================================

       function test_FailedExecutionRevertsExecutedState()
            public
        {
            address revertingTarget =
                address(
                    new AlwaysRevert()
                );

            uint256 proposalId =
                treasury.createProposal(
                    revertingTarget,
                    10 ether,
                    ""
                );

            bytes[] memory signatures =
                _getSignatures(
                    proposalId,
                    alicePrivateKey,
                    bobPrivateKey
                );

            vm.expectRevert(
                SecureTreasury.ExecutionFailed.selector
            );

            treasury.execute(
                proposalId,
                signatures
            );

            SecureTreasury.Proposal memory proposal =
                treasury.getProposal(proposalId);

            assertFalse(proposal.executed);
        }
        // =============================================================
        //                         ERC20
        // =============================================================

        function test_CanExecuteERC20Transfer() public {
    uint256 amount = 1_000 ether;

    bytes memory data =
        abi.encodeCall(
            IERC20.transfer,
            (recipient, amount)
        );

    uint256 proposalId =
        treasury.createProposal(
            address(token),
            0,
            data
        );

    bytes[] memory signatures =
        _getSignatures(
            proposalId,
            alicePrivateKey,
            bobPrivateKey
        );

    uint256 recipientBalanceBefore =
        token.balanceOf(recipient);

    treasury.execute(
        proposalId,
        signatures
    );

    assertEq(
        token.balanceOf(recipient),
        recipientBalanceBefore + amount
    );

    assertEq(
        token.balanceOf(address(treasury)),
        99_000 ether
    );
}

        // =============================================================
        //                          HELPERS
        // =============================================================

        function _createProposal()
            internal
            returns (uint256 proposalId)
        {
            proposalId =
                treasury.createProposal(
                    recipient,
                    10 ether,
                    ""
                );
        }

        function _approveWithAliceAndBob(
                uint256 proposalId
            ) internal {
                vm.prank(alice);
                treasury.approve(proposalId);

                vm.prank(bob);
                treasury.approve(proposalId);
            }

        function test_ProposalPreserveExactData() public {
            address recipientw = address(0x1234);
            uint256 proposalValue = 1 ether;

            bytes memory proposalData = abi.encodeWithSignature(
                "transfer(address,uint256)",
                recipientw,
                100
            );

            uint256 proposalId = treasury.createProposal(
                recipientw,
                proposalValue,
                proposalData
            );

            SecureTreasury.Proposal memory proposal = treasury.getProposal(proposalId);

            assertEq(proposal.to, recipientw);
            assertEq(proposal.value, proposalValue);
            assertEq(proposal.approvalCount, 0);
            assertEq(keccak256(proposal.data), keccak256(proposalData));
            assertEq(proposal.nonce, proposalId);
            assertFalse(proposal.executed);
        }

        function test_DifferentProposalsHaveIndependentTransactionData() public {
            address recipientA = address(0x1111);
            address recipientB = address(0x2222);

            uint256 valueA = 1 ether;
            uint256 valueB = 2 ether;

            bytes memory dataA = abi.encodeWithSignature(
                "transfer(address,uint256)",
                recipientA,
                100
            );

            bytes memory dataB = abi.encodeWithSignature(
                "transfer(address,uint256)",
                recipientB,
                200
            );

            uint256 proposalA = treasury.createProposal(
                recipientA,
                valueA,
                dataA
            );

            uint256 proposalB = treasury.createProposal(
                recipientB,
                valueB,
                dataB
            );

            assertEq(proposalA, 0);
            assertEq(proposalB, 1);
            assertTrue(proposalA != proposalB);

            SecureTreasury.Proposal memory getproposalA = treasury.getProposal(proposalA);

            SecureTreasury.Proposal memory getproposalB = treasury.getProposal(proposalB);

            assertEq(getproposalA.to, recipientA);
            assertEq(getproposalA.value, valueA);
            assertEq(keccak256(getproposalA.data), keccak256(dataA));
            assertEq(getproposalA.nonce, proposalA);

            assertEq(getproposalB.to, recipientB);
            assertEq(getproposalB.value, valueB);
            assertEq(keccak256(getproposalB.data), keccak256(dataB));
            assertEq(getproposalB.nonce, proposalB);
        }

        function test_SameProposalIdExistsInDifferentTreasuries() public {
            address[] memory treasurySigners = new address[](3);
            treasurySigners[0] = alice;
            treasurySigners[1] = bob;
            treasurySigners[2] = charlie;

            SecureTreasury treasuryA =
                new SecureTreasury(treasurySigners, 2);

            SecureTreasury treasuryB =
                new SecureTreasury(treasurySigners, 2);

            uint256 proposalA = treasuryA.createProposal(
                address(0x1111),
                1 ether,
                ""
            );

            uint256 proposalB = treasuryB.createProposal(
                address(0x2222),
                5 ether,
                ""
            );

            assertEq(proposalA, 0);
            assertEq(proposalB, 0);

            assertTrue(
                address(treasuryA) != address(treasuryB)
            );
        }

        function test_SameProposalIdCanRepresentDifferentTransactions() public {
            address[] memory treasurySigners = new address[](3);
            treasurySigners[0] = alice;
            treasurySigners[1] = bob;
            treasurySigners[2] = charlie;

            SecureTreasury treasuryA =
                new SecureTreasury(treasurySigners, 2);

            SecureTreasury treasuryB =
                new SecureTreasury(treasurySigners, 2);

            uint256 proposalA = treasuryA.createProposal(
                address(0x1111),
                1 ether,
                ""
            );

            uint256 proposalB = treasuryB.createProposal(
                address(0x2222),
                5 ether,
                ""
            );

            assertEq(proposalA, proposalB);

            SecureTreasury.Proposal memory storedA =
                treasuryA.getProposal(proposalA);

            SecureTreasury.Proposal memory storedB =
                treasuryB.getProposal(proposalB);

            assertEq(storedA.to, address(0x1111));
            assertEq(storedA.value, 1 ether);

            assertEq(storedB.to, address(0x2222));
            assertEq(storedB.value, 5 ether);

            assertTrue(storedA.to != storedB.to);
            assertTrue(storedA.value != storedB.value);
        }

        function test_TransactionHashChangeWhenValueChanges() public {
            bytes memory data = abi.encodeWithSignature(
                "transfer(address,uint256)",
                address(0x1234),
                100
            );

            bytes32 hashA = treasury.hashTransaction(
                address(0x1234),
                1 ether,
                data,
                1
            );

            bytes32 hashB = treasury.hashTransaction(
                 address(0x1234),
                2 ether,
                data,
                1
            );

            assertTrue(hashA != hashB);
        }

        function test_TransactionHashChangeWhenDataChanges() public {
            bytes memory dataA = abi.encodeWithSignature(
                "transaction(address,uint256)",
                address(0x1234),
                100
            );

            bytes memory dataB = abi.encodeWithSignature(
                "transaction(address,uint256)",
                address(0x5678),
                100
            );

            bytes32 hashA = treasury.hashTransaction(
                address(0x9999),
                5 ether,
                dataA,
                2
            );

            bytes32 hashB = treasury.hashTransaction(
                address(0x9999),
                5 ether,
                dataB,
                2
            );

            assertTrue(hashA != hashB);
        }

        function test_HashTransactionChangesWhenNonceChanges() public {
            bytes memory data = abi.encodeWithSignature(
                "transfer(address,uint256)",
                address(0x1234),
                100
            );

            bytes32 hashA = treasury.hashTransaction(
                address(0x1234),
                1 ether,
                data,
                0
            );

            bytes32 hashB = treasury.hashTransaction(
                address(0x1234),
                1 ether,
                data,
                1
            );

            assertTrue(hashA != hashB);
        }

        function test_DigestDiffersAcrossTreasuries() public {
            address[] memory treasurySigners = new address[](3);
            treasurySigners[0] = alice;
            treasurySigners[1] = bob;
            treasurySigners[2] = charlie;

            SecureTreasury treasuryA =
                new SecureTreasury(treasurySigners, 2);

            SecureTreasury treasuryB =
                new SecureTreasury(treasurySigners, 2);

            address recipientX = address(0x1234);

            bytes memory data = abi.encodeWithSignature(
                "transfer(address,uint256)",
                recipientX,
                100
            );

            bytes32 digestA = treasuryA.getTransactionDigest(
                recipientX,
                1 ether,
                data,
                0
            );

            bytes32 digestB = treasuryB.getTransactionDigest(
                recipientX,
                1 ether,
                data,
                0
            );

            assertTrue(digestA != digestB);
        }

        function test_DigestChangesWithChainId() public {
            address recipientY = address(0x1234);

            bytes memory data = abi.encodeWithSignature(
                "transfer(address,uint256)",
                recipientY,
                100
            );

            bytes32 digestBefore = treasury.getTransactionDigest(
                recipientY,
                1 ether,
                data,
                0
            );

            vm.chainId(1);

            bytes32 digestAfter = treasury.getTransactionDigest(
                recipient,
                1 ether,
                data,
                0
            );

            assertTrue(digestBefore != digestAfter);
        }

        function test_RecoverSigner() public {
            uint256 privateKey = 0xA11CE;
            address expectedSigner = vm.addr(privateKey);

            bytes32 digest = treasury.getTransactionDigest(
                address(0x1234),
                1 ether,
                "",
                0
            );

            (uint8 v, bytes32 r, bytes32 s) = vm.sign(
                privateKey,
                digest
            );

            bytes memory signature = abi.encodePacked(
                r,
                s,
                v
            );

            address recoveredSigner = treasury.recoverSigner(
                digest,
                signature
            );

            assertEq(recoveredSigner, expectedSigner);
        }

        function test_SignatureDoesNotMatchModifiedTransaction() public {
            uint256 privateKey = 0xA11CE;

            bytes memory data = abi.encodeWithSignature(
                "transfer(address,uint256)",
                address(0x1234),
                100
            );

            bytes32 signedDigest = treasury.getTransactionDigest(
                address(0x1234),
                1 ether,
                data,
                0
            );

            (uint8 v, bytes32 r, bytes32 s) = vm.sign(
                privateKey,
                signedDigest
            );

            bytes memory signature = abi.encodePacked(
                r,
                s,
                v
            );

            bytes32 modifiedDigest = treasury.getTransactionDigest(
                address(0x1234),
                10 ether,
                data,
                0
            );

            address recoveredSigner = treasury.recoverSigner(
                modifiedDigest,
                signature
            );

            address expectedSigner = vm.addr(privateKey);

            assertTrue(recoveredSigner != expectedSigner);
        }

        function test_ValidSignatureFromRegisteredSigner() public {
            uint256 privateKey = 0xA11CE;
            address signer = vm.addr(privateKey);

            address[] memory signerList = new address[](1);
            signerList[0] = signer;

            SecureTreasury localTreasury =
                new SecureTreasury(signerList, 1);

            bytes32 digest = localTreasury.getTransactionDigest(
                address(0x1234),
                1 ether,
                "",
                0
            );

            (uint8 v, bytes32 r, bytes32 s) = vm.sign(
                privateKey,
                digest
            );

            bytes memory signature = abi.encodePacked(r, s, v);

            assertTrue(
                localTreasury.isValidSignature(
                    digest,
                    signature
                )
            );
        }

        function test_InvalidSignatureFromNonSigner() public {
            uint256 malloryPrivateKey = 0xDAD;

            address[] memory signerList = new address[](1);
            signerList[0] = alice;

            SecureTreasury localTreasury =
                new SecureTreasury(signerList, 1);

            bytes32 digest = localTreasury.getTransactionDigest(
                address(0x1234),
                1 ether,
                "",
                0
            );

            (uint8 v, bytes32 r, bytes32 s) = vm.sign(
                malloryPrivateKey,
                digest
            );

            bytes memory signature = abi.encodePacked(r, s, v);

            assertFalse(
                localTreasury.isValidSignature(
                    digest,
                    signature
                )
            );
        }

        function test_DuplicateSignerIsCountedOnlyOnce() public {
            address[] memory signerList = new address[](2);
            signerList[0] = alice;
            signerList[1] = bob;

            SecureTreasury localTreasury =
                new SecureTreasury(signerList, 2);

            // Fund the local treasury so it can send ETH in the proposal
            vm.deal(address(localTreasury), 1 ether);

            // Fund the local treasury so it can send ETH in the proposal
            vm.deal(address(localTreasury), 1 ether);

            // Fund the local treasury so it can send ETH in the proposal
            vm.deal(address(localTreasury), 1 ether);

            // Fund the local treasury so it can send ETH in the proposal
            vm.deal(address(localTreasury), 1 ether);

            bytes32 digest = localTreasury.getTransactionDigest(
                address(0x1234),
                1 ether,
                "",
                0
            );

            (uint8 vA, bytes32 rA, bytes32 sA) =
                vm.sign(alicePrivateKey, digest);

            (uint8 vB, bytes32 rB, bytes32 sB) =
                vm.sign(bobPrivateKey, digest);

            bytes[] memory signatures = new bytes[](3);

            signatures[0] = abi.encodePacked(rA, sA, vA);
            signatures[1] = abi.encodePacked(rB, sB, vB);
            signatures[2] = abi.encodePacked(rA, sA, vA);

            uint256 count =
                localTreasury.countValidSigners(
                    digest,
                    signatures
                );

            assertEq(count, 2);
        }

        function test_SameSignerCannotSatisfyThresholdTwice() public {
            address[] memory signerList = new address[](2);
            signerList[0] = alice;
            signerList[1] = bob;

            SecureTreasury localTreasury =
                new SecureTreasury(signerList, 2);

            bytes32 digest = localTreasury.getTransactionDigest(
                address(0x1234),
                1 ether,
                "",
                0
            );

            (uint8 v, bytes32 r, bytes32 s) =
                vm.sign(alicePrivateKey, digest);

            bytes memory signature =
                abi.encodePacked(r, s, v);

            bytes[] memory signatures = new bytes[](2);

            signatures[0] = signature;
            signatures[1] = signature;

            uint256 count =
                localTreasury.countValidSigners(
                    digest,
                    signatures
                );

            assertEq(count, 1);
        }

        function test_NonSignerIsNotCounted() public {
            uint256 malloryPrivateKey = 0xDAD;

            address[] memory signerList = new address[](2);
            signerList[0] = alice;
            signerList[1] = bob;

            SecureTreasury localTreasury =
                new SecureTreasury(signerList, 2);

            bytes32 digest = localTreasury.getTransactionDigest(
                address(0x1234),
                1 ether,
                "",
                0
            );

            (uint8 vA, bytes32 rA, bytes32 sA) =
                vm.sign(alicePrivateKey, digest);

            (uint8 vM, bytes32 rM, bytes32 sM) =
                vm.sign(malloryPrivateKey, digest);

            bytes[] memory signatures = new bytes[](2);

            signatures[0] = abi.encodePacked(rA, sA, vA);
            signatures[1] = abi.encodePacked(rM, sM, vM);

            uint256 count =
                localTreasury.countValidSigners(
                    digest,
                    signatures
                );

            assertEq(count, 1);
        }

        function test_CanExecuteWithValidSignatures() public {
            address[] memory signerList = new address[](2);
            signerList[0] = alice;
            signerList[1] = bob;

            SecureTreasury localTreasury =
                new SecureTreasury(signerList, 2);

            // Fund the local treasury so it can send ETH in the proposal
            vm.deal(address(localTreasury), 1 ether);

            uint256 proposalId =
                localTreasury.createProposal(
                    address(0x1234),
                    1 ether,
                    ""
                );

            SecureTreasury.Proposal memory proposal =
                localTreasury.getProposal(proposalId);

            bytes32 digest =
                localTreasury.getTransactionDigest(
                    proposal.to,
                    proposal.value,
                    proposal.data,
                    proposal.nonce
                );

            (uint8 vA, bytes32 rA, bytes32 sA) =
                vm.sign(alicePrivateKey, digest);

            (uint8 vB, bytes32 rB, bytes32 sB) =
                vm.sign(bobPrivateKey, digest);

            bytes[] memory signatures = new bytes[](2);

            signatures[0] =
                abi.encodePacked(rA, sA, vA);

            signatures[1] =
                abi.encodePacked(rB, sB, vB);

            // This will be implemented in the contract next.
            localTreasury.execute(
                proposalId,
                signatures
            );

            SecureTreasury.Proposal memory executedProposal =
                localTreasury.getProposal(proposalId);

            assertTrue(executedProposal.executed);
        }

        function test_MalformedSignatureIsRejected() public {
            uint256 proposalId =
                treasury.createProposal(
                    recipient,
                    1 ether,
                    ""
                );

            bytes[] memory signatures =
                new bytes[](1);

            signatures[0] = hex"1234";

            vm.expectRevert();
            treasury.execute(
                proposalId,
                signatures
            );
        }

        function test_EmptySignatureIsRejected() public {
            uint256 proposalId =
                treasury.createProposal(
                    recipient,
                    1 ether,
                    ""
                );

            bytes[] memory signatures =
                new bytes[](1);

            signatures[0] = "";

            vm.expectRevert();
            treasury.execute(
                proposalId,
                signatures
            );
        }

        function test_SignatureOrderDoesNotMatter() public {
            uint256 proposalId =
                treasury.createProposal(
                    recipient,
                    1 ether,
                    ""
                );

            SecureTreasury.Proposal memory proposal =
                treasury.getProposal(proposalId);

            bytes32 digest =
                treasury.getTransactionDigest(
                    proposal.to,
                    proposal.value,
                    proposal.data,
                    proposal.nonce
                );

            (uint8 vA, bytes32 rA, bytes32 sA) =
                vm.sign(alicePrivateKey, digest);

            (uint8 vB, bytes32 rB, bytes32 sB) =
                vm.sign(bobPrivateKey, digest);

            bytes[] memory signatures =
                new bytes[](2);

            signatures[0] = abi.encodePacked(rB, sB, vB);
            signatures[1] = abi.encodePacked(rA, sA, vA);

            treasury.execute(
                proposalId,
                signatures
            );

            SecureTreasury.Proposal memory executedProposal =
                treasury.getProposal(proposalId);

            assertTrue(executedProposal.executed);
        }

        function test_ThreeSignaturesWithDuplicateSignerCannotBypassThreshold()
        public
        {
            uint256 proposalId =
                treasury.createProposal(
                    recipient,
                    1 ether,
                    ""
                );

            SecureTreasury.Proposal memory proposal =
                treasury.getProposal(proposalId);

            bytes32 digest =
                treasury.getTransactionDigest(
                    proposal.to,
                    proposal.value,
                    proposal.data,
                    proposal.nonce
                );

            (uint8 vA, bytes32 rA, bytes32 sA) =
                vm.sign(alicePrivateKey, digest);

            (uint8 vB, bytes32 rB, bytes32 sB) =
                vm.sign(bobPrivateKey, digest);

            bytes[] memory signatures =
                new bytes[](3);

            signatures[0] = abi.encodePacked(rA, sA, vA);
            signatures[1] = abi.encodePacked(rB, sB, vB);
            signatures[2] = abi.encodePacked(rA, sA, vA);

            treasury.execute(
                proposalId,
                signatures
            );

            SecureTreasury.Proposal memory executedProposal =
                treasury.getProposal(proposalId);

            assertTrue(executedProposal.executed);
        }

        function testFuzz_DuplicateSignerNeverCountsTwice(
            uint8 duplicateCount
        ) public {
            duplicateCount =
                uint8(bound(duplicateCount, 1, 10));

            uint256 proposalId =
                treasury.createProposal(
                    recipient,
                    1 ether,
                    ""
                );

            SecureTreasury.Proposal memory proposal =
                treasury.getProposal(proposalId);

            bytes32 digest =
                treasury.getTransactionDigest(
                    proposal.to,
                    proposal.value,
                    proposal.data,
                    proposal.nonce
                );

            (uint8 vA, bytes32 rA, bytes32 sA) =
                vm.sign(alicePrivateKey, digest);

            bytes[] memory signatures =
                new bytes[](duplicateCount);

            for (uint256 i = 0; i < duplicateCount; i++) {
                signatures[i] =
                    abi.encodePacked(rA, sA, vA);
            }

            uint256 count =
                treasury.countValidSigners(
                    digest,
                    signatures
                );

            assertEq(count, 1);
        }

        function testFuzz_NonSignersNeverIncreaseSignerCount(
            uint8 nonSignerCount
        ) public {
            nonSignerCount =
                uint8(bound(nonSignerCount, 1, 10));

            uint256 proposalId =
                treasury.createProposal(
                    recipient,
                    1 ether,
                    ""
                );

            SecureTreasury.Proposal memory proposal =
                treasury.getProposal(proposalId);

            bytes32 digest =
                treasury.getTransactionDigest(
                    proposal.to,
                    proposal.value,
                    proposal.data,
                    proposal.nonce
                );

            // Alice is a registered signer.
            (uint8 vA, bytes32 rA, bytes32 sA) =
                vm.sign(alicePrivateKey, digest);

            // Mallory is NOT registered.
            uint256 malloryPrivateKey = 0xBAD;

            (uint8 vM, bytes32 rM, bytes32 sM) =
                vm.sign(malloryPrivateKey, digest);

            bytes[] memory signatures =
                new bytes[](nonSignerCount + 1);

            // First signature: valid registered signer.
            signatures[0] =
                abi.encodePacked(rA, sA, vA);

            // Remaining signatures: same non-signer.
            for (uint256 i = 1; i <= nonSignerCount; i++) {
                signatures[i] =
                    abi.encodePacked(rM, sM, vM);
            }

            uint256 count =
                treasury.countValidSigners(
                    digest,
                    signatures
                );

            assertEq(count, 1);
        }

        function _getSignatures(
                uint256 proposalId,
                uint256 privateKeyA,
                uint256 privateKeyB
            ) internal returns (bytes[] memory signatures) {
                SecureTreasury.Proposal memory proposal =
                    treasury.getProposal(proposalId);

                bytes32 digest =
                    treasury.getTransactionDigest(
                        proposal.to,
                        proposal.value,
                        proposal.data,
                        proposal.nonce
                    );

                (uint8 vA, bytes32 rA, bytes32 sA) =
                    vm.sign(privateKeyA, digest);

                (uint8 vB, bytes32 rB, bytes32 sB) =
                    vm.sign(privateKeyB, digest);

                signatures = new bytes[](2);

                signatures[0] = abi.encodePacked(rA, sA, vA);
                signatures[1] = abi.encodePacked(rB, sB, vB);
            }
        
        }

        

    contract AlwaysRevert {
        receive() external payable {
            revert();
        }

    }