// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

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

    receive() external payable{
        if(!attackAttempted){
            attackAttempted = true;
            try treasury.execute(proposalId) {
                revert("REENTRANCY SUCCEEDED");
            } catch  {}
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

contract SecureTreasuryTest is Test {
    SecureTreasury internal treasury;
    MockERC20 internal token;
    address internal alice;
    address internal bob;
    address internal charlie;
    address internal david;
    address internal recipient;
    FalseReturningToken internal falseToken;

    function setUp() public{
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        charlie = makeAddr("charlie");
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
function test_CannotExecuteWithoutThreshold() public {
        uint256 proposalId =
            _createProposal();

        vm.prank(alice);

        treasury.approve(proposalId);

        vm.expectRevert(
            SecureTreasury.InsufficientApprovals.selector
        );

        treasury.execute(proposalId);
    }

    function test_CanExecuteAfterThreshold() public {
        uint256 proposalId =
            _createProposal();

        vm.prank(alice);
        treasury.approve(proposalId);

        vm.prank(bob);
        treasury.approve(proposalId);

        uint256 recipientBalanceBefore =
            recipient.balance;

        treasury.execute(proposalId);

        assertEq(
            recipient.balance,
            recipientBalanceBefore + 10 ether
        );

        // (
        //     ,
        //     ,
        //     ,
        //     ,
        //     ,
        //     bool executed
        // ) = treasury.getProposal(proposalId);

        //assertTrue(executed);
    }
 function test_CannotExecuteTwice() public {
        uint256 proposalId =
            _createProposal();

        _approveWithAliceAndBob(proposalId);

        treasury.execute(proposalId);

        vm.expectRevert(
            SecureTreasury.AlreadyExecuted.selector
        );

        treasury.execute(proposalId);
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

        treasury.execute(proposalId);

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

        _approveWithAliceAndBob(proposalId);

        vm.expectRevert(
            SecureTreasury.ExecutionFailed.selector
        );

        treasury.execute(proposalId);

        // (
        //     ,
        //     ,
        //     ,
        //     ,
        //     ,
        //     bool executed
        // ) = treasury.getProposal(proposalId);

        // assertFalse(executed);
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

        _approveWithAliceAndBob(proposalId);

        uint256 recipientBalanceBefore =
            token.balanceOf(recipient);

        treasury.execute(proposalId);

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
}

contract AlwaysRevert {
    receive() external payable {
        revert();
    }

}