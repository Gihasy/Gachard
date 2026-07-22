// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GachardCard
 * @notice BEP-1155 token untuk kartu Gachard dengan state machine Digital/Vaulted
 * @dev ADR-001: BEP-1155 (one-token-per-instance, bukan fungible balance)
 * @dev ADR-004: Lock & Transfer ke Vault bukan Burn
 */
contract GachardCard is ERC1155, Ownable {
    enum CardStatus { Digital, Vaulted }
    enum Rarity { Common, Rare, Epic, Legendary }

    uint256 public nextTokenId = 1;

    mapping(uint256 => CardStatus) public cardStatus;
    mapping(uint256 => Rarity) public cardRarity;
    mapping(uint256 => bytes32) public storedHash;
    mapping(uint256 => address) public lastOwner;

    event CardMinted(uint256 indexed tokenId, address indexed to, CardStatus status, Rarity rarity);
    event CardStatusChanged(uint256 indexed tokenId, CardStatus oldStatus, CardStatus newStatus);

    constructor() ERC1155("") Ownable(msg.sender) {}

    /**
     * @notice Mint kartu baru dengan status default Digital dan rarity tertentu
     * @param to Alamat penerima kartu
     * @param rarity Rarity kartu (0=Common, 1=Rare, 2=Epic, 3=Legendary)
     * @return tokenId ID kartu yang baru di-mint
     */
    function mintCard(address to, uint8 rarity) external onlyOwner returns (uint256 tokenId) {
        require(rarity <= 3, "Invalid rarity");
        tokenId = nextTokenId++;
        _mint(to, tokenId, 1, "");
        cardStatus[tokenId] = CardStatus.Digital;
        cardRarity[tokenId] = Rarity(rarity);
        lastOwner[tokenId] = to;
        emit CardMinted(tokenId, to, CardStatus.Digital, Rarity(rarity));
    }

    /**
     * @notice Override transfer untuk menolak transfer saat status Vaulted
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override {
        for (uint256 i = 0; i < ids.length; i++) {
            if (cardStatus[ids[i]] == CardStatus.Vaulted && from != address(0)) {
                revert("Card is vaulted, transfer blocked");
            }
        }
        super._update(from, to, ids, values);
    }
}
