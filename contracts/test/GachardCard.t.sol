// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/GachardCard.sol";

contract GachardCardTest is Test {
    GachardCard public card;
    address public user1 = address(0x1);
    address public user2 = address(0x2);

    function setUp() public {
        card = new GachardCard();
    }

    function test_mint_creates_token_with_digital_status() public {
        uint256 tokenId = card.mintCard(user1, 0); // 0 = Common

        assertEq(card.balanceOf(user1, tokenId), 1);
        assertEq(uint8(card.cardStatus(tokenId)), uint8(GachardCard.CardStatus.Digital));
    }

    function test_mint_stores_rarity() public {
        uint256 id1 = card.mintCard(user1, 0); // Common
        uint256 id2 = card.mintCard(user1, 2); // Epic
        uint256 id3 = card.mintCard(user1, 3); // Legendary

        assertEq(uint8(card.cardRarity(id1)), 0);
        assertEq(uint8(card.cardRarity(id2)), 2);
        assertEq(uint8(card.cardRarity(id3)), 3);
    }

    function test_mint_increments_token_id() public {
        uint256 id1 = card.mintCard(user1, 0);
        uint256 id2 = card.mintCard(user2, 0);

        assertEq(id2, id1 + 1);
    }

    function test_mint_multiple_to_same_user() public {
        uint256 id1 = card.mintCard(user1, 0);
        uint256 id2 = card.mintCard(user1, 1);

        assertEq(card.balanceOf(user1, id1), 1);
        assertEq(card.balanceOf(user1, id2), 1);
        assertTrue(id1 != id2);
    }

    function test_mint_emits_event() public {
        vm.expectEmit(true, false, false, true);
        emit GachardCard.CardMinted(1, user1, GachardCard.CardStatus.Digital, GachardCard.Rarity.Common);
        card.mintCard(user1, 0);
    }

    function test_only_owner_can_mint() public {
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        card.mintCard(user1, 0);
    }

    function test_mint_reverts_on_invalid_rarity() public {
        vm.expectRevert("Invalid rarity");
        card.mintCard(user1, 4); // 4 tidak valid
    }
}
