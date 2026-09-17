// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SecureTreasury is EIP712{
    using SafeERC20 for IERC20;

    // Storage
    struct Proposal {
        address to;
        uint256 value;
        uint256 approvalCount; // Number of approval
        bytes data;
        uint256 nonce;
        bool executed;
    }

    address [] public signers;
    mapping (address => bool) public isSigner;
    uint256 public immutable threshold;
    uint256 public proposalCount;

    bytes32 private constant TRANSACTION_TYPEHASH = keccak256("Transaction(address to,uint256 value,bytes data,uint256 nonce)");

    mapping (uint256 => Proposal) proposals;
    mapping (uint256 => mapping (address => bool)) public approved;

    // Errors
    error InvalidSigner();
    error DuplicateSigner();
    error InvalidThreshold();
    error InvalidProposal();
    error NotSigner();
    error AlreadyApproved();
    error AlreadyExecuted();
    error InsufficientApprovals();
    error ExecutionFailed();

    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        // uint256 indexed proposer,
        address indexed to,
        uint256 value,
        bytes data,
        uint256 nonce
    );

    event ProposalApproved(
        uint256 indexed proposalId,
        address indexed signer
    );

    event ProposalExecuted(
        uint256 indexed proposalId
    );

    // Constructor
    // chainId et verifyingContract are generated automatically
    constructor(address[] memory initialSigners, uint256 initialThreshold)EIP712("SecureTreasury","1"){
        // Check 1
        if(initialSigners.length == 0 || initialThreshold == 0 || initialThreshold > initialSigners.length){
            revert InvalidThreshold();   
        }
        
        for(uint256 i = 0; i < initialSigners.length; i++){
            address signer = initialSigners[i];
            // Check 2
            if(signer == address(0)){
                revert InvalidSigner();
            }
            // Check 3, is signer exist
            if(isSigner[signer]){
                revert DuplicateSigner();
            }
            // Assignement
            isSigner[signer] = true;
            signers.push(signer);
        }
        // Initialise threshold
        threshold = initialThreshold;
    }

    // Create Proposal
    function createProposal(address to, uint256 value, bytes calldata data) external returns (uint256 proposalId) {
        if(to == address(0)){
            revert InvalidProposal();
        }

        // if(value == 0){
        //     revert InvalidProposal();
        // }

        proposalId = proposalCount;
        proposals[proposalId] = Proposal({
            to:to,
            value:value,
            data:data,
            approvalCount:0,
            nonce:proposalId,
            executed:false           
        });

        proposalCount++;

        emit ProposalCreated(
            proposalId,
            to,
            value,
            data,
            proposalId
        );
    }

    function approve(uint256 proposalId) external{
        if(!isSigner[msg.sender]){
            revert NotSigner();
        }

        if(proposalId >= proposalCount){
            revert InvalidProposal();
        }

        if(approved[proposalId][msg.sender]){
            revert AlreadyApproved();
        }

        Proposal storage proposal = proposals[proposalId];

        if(proposal.executed){
            revert AlreadyExecuted();
        }

        approved[proposalId][msg.sender] = true;

        proposal.approvalCount++;

        emit ProposalApproved(
            proposalId,
            msg.sender
        );
    }

    function execute(
        uint256 proposalId,
        bytes[] calldata signatures
    ) external {
        if (proposalId >= proposalCount) {
            revert InvalidProposal();
        }

        Proposal storage proposal = proposals[proposalId];

        if (proposal.executed) {
            revert AlreadyExecuted();
        }

        bytes32 digest = getTransactionDigest(
            proposal.to,
            proposal.value,
            proposal.data,
            proposal.nonce
        );

        uint256 validSignerCount =
            _validateSignatures(
                digest,
                signatures
            );

        if (validSignerCount < threshold) {
            revert InsufficientApprovals();
        }

        // Effects before interaction
        proposal.executed = true;

        // External interaction
        (bool success,) = proposal.to.call{
            value: proposal.value
        }(proposal.data);

        if (!success) {
            revert ExecutionFailed();
        }

        emit ProposalExecuted(proposalId);
    }

    // Receive ETH
    receive() external payable {}

    // Get signers
    function getSigner() external view returns (address [] memory) {
        return signers;
    }
    // Get Proposal
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        if(proposalId >= proposalCount){
            revert InvalidProposal();
        }
        return proposals[proposalId];
    }

    // Get treasury balance
    function treasuryBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function hashTransaction(
        address to,
        uint256 value,
        bytes memory data,
        uint256 nonce
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                TRANSACTION_TYPEHASH,
                to,
                value,
                keccak256(data),
                nonce
            )
        );
    }

    function getTransactionDigest(
        address to,
        uint256 value,
        bytes memory data,
        uint256 nonce
    ) public view returns (bytes32) {
        bytes32 structHash = hashTransaction(
            to,
            value,
            data,
            nonce
        );

        return _hashTypedDataV4(structHash);
    }

    function recoverSigner(
        bytes32 digest,
        bytes calldata signature
    ) public pure returns (address) {
        return ECDSA.recover(digest, signature);
    }

    function isValidSignature(bytes32 digest, bytes calldata signature) public view returns (bool) {
        address signer = ECDSA.recover(digest,signature);

        return isSigner[signer];
    }

   
    function countValidSigners(
        bytes32 digest,
        bytes[] calldata signatures
    ) public view returns (uint256 count) {
        address[] memory recoveredSigners =
            new address[](signatures.length);

        for (uint256 i = 0; i < signatures.length; i++) {
            address signer = ECDSA.recover(
                digest,
                signatures[i]
            );

            // Ignore unauthorized signers
            if (!isSigner[signer]) {
                continue;
            }

            bool alreadyCounted = false;

            // Check whether this signer was already counted
            for (uint256 j = 0; j < i; j++) {
                if (recoveredSigners[j] == signer) {
                    alreadyCounted = true;
                    break;
                }
            }

            if (alreadyCounted) {
                continue;
            }

            recoveredSigners[i] = signer;
            count++;
        }
    }

    function _validateSignatures(
        bytes32 digest,
        bytes[] calldata signatures
    ) internal view returns (uint256 count) {
        address[] memory recoveredSigners =
            new address[](signatures.length);

        for (uint256 i = 0; i < signatures.length; i++) {
            address signer = ECDSA.recover(
                digest,
                signatures[i]
            );

            // The recovered address must be a registered signer.
            if (!isSigner[signer]) {
                continue;
            }

            bool alreadyCounted = false;

            // Prevent the same signer from being counted twice.
            for (uint256 j = 0; j < i; j++) {
                if (recoveredSigners[j] == signer) {
                    alreadyCounted = true;
                    break;
                }
            }

            if (alreadyCounted) {
                continue;
            }

            recoveredSigners[i] = signer;
            count++;
        }
    }    
}