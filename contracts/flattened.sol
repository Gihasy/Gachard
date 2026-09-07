// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ============================================================================
// OpenZeppelin Contracts v5.6.0 - Flattened for BSCScan Verification
// ============================================================================

// ---- Context.sol ----
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

// ---- IERC165.sol ----
interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// ---- ERC165.sol ----
abstract contract ERC165 is IERC165 {
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}

// ---- IERC1155.sol ----
interface IERC1155 is IERC165 {
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event ApprovalForAll(address indexed account, address operator, bool approved);
    event URI(string value, uint256 indexed id);

    function balanceOf(address account, uint256 id) external view returns (uint256);
    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory);
    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data) external;
    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata values, bytes calldata data) external;
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address account, address operator) external view returns (bool);
}

// ---- IERC1155MetadataURI.sol ----
interface IERC1155MetadataURI is IERC1155 {
    function uri(uint256 id) external view returns (string memory);
}

// ---- IERC1155Errors.sol ----
interface IERC1155Errors {
    error ERC1155InsufficientBalance(address sender, uint256 balance, uint256 needed, uint256 tokenId);
    error ERC1155InvalidSender(address sender);
    error ERC1155InvalidReceiver(address receiver);
    error ERC1155MissingApproval(address operator, address owner);
    error ERC1155InvalidApprover(address approver);
    error ERC1155InvalidOperator(address operator);
    error ERC1155InvalidArrayLength(uint256 idsLength, uint256 valuesLength);
}

// ---- Arrays.sol (simplified) ----
library Arrays {
    function findUpperBound(uint256[] storage array, uint256 element) internal view returns (uint256) {
        uint256 low = 0;
        uint256 high = array.length;
        if (high == 0) return 0;
        while (low < high) {
            uint256 mid = Math.average(low, high);
            if (element < array[mid]) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }
        return low;
    }
}

// ---- Math.sol (simplified) ----
library Math {
    function average(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a & b) + (a ^ b) / 2;
    }
}

// ---- ERC1155Utils.sol (simplified) ----
library ERC1155Utils {
    function checkOnERC1155Received(address operator, address from, address to, uint256 id, uint256 value, bytes memory data) internal returns (bool) {
        if (to.code.length > 0) {
            try IERC1155Receiver(to).onERC1155Received(operator, from, id, value, data) returns (bytes4 retval) {
                return retval == IERC1155Receiver.onERC1155Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) revert IERC1155InvalidReceiver(to);
                assembly {
                    revert(add(32, reason), mload(reason))
                }
            }
        } else {
            return true;
        }
    }

    function checkOnERC1155BatchReceived(address operator, address from, address to, uint256[] memory ids, uint256[] memory values, bytes memory data) internal returns (bool) {
        if (to.code.length > 0) {
            try IERC1155Receiver(to).onERC1155BatchReceived(operator, from, ids, values, data) returns (bytes4 retval) {
                return retval == IERC1155Receiver.onERC1155BatchReceived.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) revert IERC1155InvalidReceiver(to);
                assembly {
                    revert(add(32, reason), mload(reason))
                }
            }
        } else {
            return true;
        }
    }
}

// ---- IERC1155Receiver.sol ----
interface IERC1155Receiver is IERC165 {
    function onERC1155Received(address operator, address from, uint256 id, uint256 value, bytes calldata data) external returns (bytes4);
    function onERC1155BatchReceived(address operator, address from, uint256[] calldata ids, uint256[] calldata values, bytes calldata data) external returns (bytes4);
}

// ---- ERC1155.sol ----
abstract contract ERC1155 is Context, ERC165, IERC1155, IERC1155MetadataURI, IERC1155Errors {
    using Arrays for uint256[];
    using Arrays for address[];

    mapping(uint256 id => mapping(address account => uint256)) private _balances;
    mapping(address account => mapping(address operator => bool)) private _operatorApprovals;
    string private _uri;

    constructor(string memory uri_) {
        _setURI(uri_);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IERC1155).interfaceId ||
            interfaceId == type(IERC1155MetadataURI).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function uri(uint256) public view virtual override returns (string memory) {
        return _uri;
    }

    function balanceOf(address account, uint256 id) public view virtual override returns (uint256) {
        require(account != address(0), "ERC1155: address zero is not a valid owner");
        return _balances[id][account];
    }

    function balanceOfBatch(address[] memory accounts, uint256[] memory ids) public view virtual override returns (uint256[] memory) {
        require(accounts.length == ids.length, "ERC1155: accounts and ids length mismatch");
        uint256[] memory batchBalances = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; ++i) {
            batchBalances[i] = balanceOf(accounts[i], ids[i]);
        }
        return batchBalances;
    }

    function setApprovalForAll(address operator, bool approved) public virtual override {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    function isApprovedForAll(address account, address operator) public view virtual override returns (bool) {
        return _operatorApprovals[account][operator];
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes memory data) public virtual override {
        require(from == _msgSender() || isApprovedForAll(from, _msgSender()), "ERC1155: caller is not token owner or approved");
        _safeTransferFrom(from, to, id, value, data);
    }

    function safeBatchTransferFrom(address from, address to, uint256[] memory ids, uint256[] memory values, bytes memory data) public virtual override {
        require(from == _msgSender() || isApprovedForAll(from, _msgSender()), "ERC1155: caller is not token owner or approved");
        _safeBatchTransferFrom(from, to, ids, values, data);
    }

    function _safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes memory data) internal virtual {
        if (to == address(0)) revert ERC1155InvalidReceiver(address(0));
        address operator = _msgSender();
        uint256[] memory ids = new uint256[](1);
        ids[0] = id;
        uint256[] memory values = new uint256[](1);
        values[0] = value;
        _update(operator, from, to, ids, values);
    }

    function _safeBatchTransferFrom(address from, address to, uint256[] memory ids, uint256[] memory values, bytes memory data) internal virtual {
        if (ids.length != values.length) revert ERC1155InvalidArrayLength(ids.length, values.length);
        if (to == address(0)) revert ERC1155InvalidReceiver(address(0));
        address operator = _msgSender();
        _update(operator, from, to, ids, values);
    }

    function _update(address operator, address from, address to, uint256[] memory ids, uint256[] memory values) internal virtual {
        if (from != address(0)) {
            for (uint256 i = 0; i < ids.length; ++i) {
                uint256 id = ids[i];
                uint256 value = values[i];
                uint256 fromBalance = _balances[id][from];
                if (fromBalance < value) revert ERC1155InsufficientBalance(from, fromBalance, value, id);
                unchecked {
                    _balances[id][from] = fromBalance - value;
                }
            }
        }
        if (to != address(0)) {
            for (uint256 i = 0; i < ids.length; ++i) {
                uint256 id = ids[i];
                uint256 value = values[i];
                unchecked {
                    _balances[id][to] += value;
                }
            }
        }
        emit TransferBatch(operator, from, to, ids, values);
    }

    function _mint(address to, uint256 id, uint256 value, bytes memory data) internal {
        if (to == address(0)) revert ERC1155InvalidReceiver(address(0));
        address operator = _msgSender();
        uint256[] memory ids = new uint256[](1);
        ids[0] = id;
        uint256[] memory values = new uint256[](1);
        values[0] = value;
        _update(operator, address(0), to, ids, values);
    }

    function _mintBatch(address to, uint256[] memory ids, uint256[] memory values, bytes memory data) internal {
        if (to == address(0)) revert ERC1155InvalidReceiver(address(0));
        if (ids.length != values.length) revert ERC1155InvalidArrayLength(ids.length, values.length);
        address operator = _msgSender();
        _update(operator, address(0), to, ids, values);
    }

    function _burn(address from, uint256 id, uint256 value) internal {
        if (from == address(0)) revert ERC1155InvalidSender(address(0));
        address operator = _msgSender();
        uint256[] memory ids = new uint256[](1);
        ids[0] = id;
        uint256[] memory values = new uint256[](1);
        values[0] = value;
        _update(operator, from, address(0), ids, values);
    }

    function _burnBatch(address from, uint256[] memory ids, uint256[] memory values) internal {
        if (from == address(0)) revert ERC1155InvalidSender(address(0));
        if (ids.length != values.length) revert ERC1155InvalidArrayLength(ids.length, values.length);
        address operator = _msgSender();
        _update(operator, from, address(0), ids, values);
    }

    function _setApprovalForAll(address owner, address operator, bool approved) internal {
        if (operator == address(0)) revert ERC1155InvalidOperator(address(0));
        if (owner == operator) revert ERC1155InvalidApprover(owner);
        _operatorApprovals[owner][operator] = approved;
        emit ApprovalForAll(owner, operator, approved);
    }

    function _setURI(string memory newuri) internal {
        _uri = newuri;
    }

    function _updateOperatorApproval(address owner, address operator, uint48 newRights) internal virtual returns (uint48) {
        return 0;
    }
}

// ---- Ownable.sol ----
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert OwnableInvalidOwner(address(0));
        _transferOwnership(initialOwner);
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) revert OwnableUnauthorizedAccount(_msgSender());
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) revert OwnableInvalidOwner(address(0));
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    error OwnableUnauthorizedAccount(address account);
    error OwnableInvalidOwner(address owner);
}

// ---- OwnableErrors.sol (included in Ownable) ----

// ============================================================================
// GachardCard Contract
// ============================================================================

/**
 * @title GachardCard
 * @notice BEP-1155 token untuk kartu Gachard dengan state machine Digital/Vaulted
 * @dev ADR-001: BEP-1155 (one-token-per-instance, bukan fungible balance)
 * @dev ADR-004: Lock & Transfer ke Vault bukan Burn
 * @dev ADR-007: recipientAddress/ownerAddress eksplisit, bukan msg.sender
 */
contract GachardCard is ERC1155, Ownable {
    enum CardStatus { Digital, Vaulted }
    enum Rarity { Common, Rare, Epic, Legendary }

    uint256 public nextTokenId = 1;

    mapping(uint256 => CardStatus) public cardStatus;
    mapping(uint256 => Rarity) public cardRarity;
    mapping(uint256 => bytes32) public storedHash;
    mapping(uint256 => address) public lastOwner;
    mapping(uint256 => uint8) public lastRiskScore;
    mapping(uint256 => bool) public flaggedSuspicious;

    event CardMinted(uint256 indexed tokenId, address indexed to, CardStatus status, Rarity rarity);
    event CardStatusChanged(uint256 indexed tokenId, CardStatus oldStatus, CardStatus newStatus);
    event MarketplaceTransfer(uint256 indexed tokenId, address indexed from, address indexed to);
    event VerificationRecorded(uint256 indexed tokenId, uint8 riskScore, bool flagged);
    event CardBurned(uint256 indexed tokenId, address indexed owner, uint8 rarity);

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
     * @notice Mint batch kartu (untuk pack) — atomik, semua atau tidak sama sekali
     * @param to Alamat penerima kartu
     * @param rarities Array rarity per kartu (0=Common, 1=Rare, 2=Epic, 3=Legendary)
     * @return tokenIds Array ID kartu yang baru di-mint
     */
    function mintBatch(address to, uint8[] calldata rarities) external onlyOwner returns (uint256[] memory tokenIds) {
        uint256 count = rarities.length;
        require(count > 0, "Empty rarities array");

        tokenIds = new uint256[](count);
        uint256[] memory amounts = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            require(rarities[i] <= 3, "Invalid rarity");
            uint256 tokenId = nextTokenId++;
            tokenIds[i] = tokenId;
            amounts[i] = 1;
            cardStatus[tokenId] = CardStatus.Digital;
            cardRarity[tokenId] = Rarity(rarities[i]);
            lastOwner[tokenId] = to;
        }

        _mintBatch(to, tokenIds, amounts, "");

        for (uint256 i = 0; i < count; i++) {
            emit CardMinted(tokenIds[i], to, CardStatus.Digital, Rarity(rarities[i]));
        }
    }

    /**
     * @notice Kunci kartu untuk cetak fisik — generate hash baru, overwrite hash lama
     * @dev onlyOwner — backend yang memanggil, bukan wallet user (ADR-007)
     * @dev Kartu TETAP di wallet user, hanya cardStatus berubah ke Vaulted.
     *      Proteksi dari _update() override yang blokir transfer selama Vaulted.
     * @param tokenId ID kartu yang akan di-print
     * @param redeemHash Hash dari redeem code yang baru (backend generate, kirim hash-nya saja)
     * @param ownerAddress Alamat pemilik kartu saat ini (untuk update lastOwner)
     */
    function requestPrint(uint256 tokenId, bytes32 redeemHash, address ownerAddress) external onlyOwner {
        require(cardStatus[tokenId] == CardStatus.Digital, "Card is not digital");
        require(ownerAddress != address(0), "Invalid owner address");
        require(balanceOf(ownerAddress, tokenId) == 1, "Owner does not hold card");

        // Simpan owner
        lastOwner[tokenId] = ownerAddress;

        // Overwrite hash lama (ADR-005)
        storedHash[tokenId] = redeemHash;

        // Ubah status ke Vaulted — kartu TETAP di wallet user
        // _update() override akan blokir transfer biasa selama Vaulted
        cardStatus[tokenId] = CardStatus.Vaulted;

        emit CardStatusChanged(tokenId, CardStatus.Digital, CardStatus.Vaulted);
    }

    /**
     * @notice Redeem kartu dari vault kembali ke digital
     * @dev Backend yang memanggil atas nama user (ADR-006, ADR-007)
     * @param tokenId ID kartu yang akan di-redeem
     * @param redeemHash Hash dari code yang dimasukkan user
     * @param recipientAddress Alamat yang akan menerima kartu (ADR-007)
     */
    function redeemCard(uint256 tokenId, bytes32 redeemHash, address recipientAddress) external onlyOwner {
        require(cardStatus[tokenId] == CardStatus.Vaulted, "Card is not vaulted");
        require(storedHash[tokenId] == redeemHash, "Invalid redeem code");

        // Simpan owner lama untuk transfer
        address previousOwner = lastOwner[tokenId];
        require(previousOwner != address(0), "Invalid previous owner");

        // Ubah status dulu, SEBELUM transfer — supaya _update() tidak memblokir
        cardStatus[tokenId] = CardStatus.Digital;

        // Update last owner
        lastOwner[tokenId] = recipientAddress;

        // Transfer dari owner lama ke recipient
        uint256[] memory ids = new uint256[](1);
        ids[0] = tokenId;
        uint256[] memory values = new uint256[](1);
        values[0] = 1;
        _update(previousOwner, recipientAddress, ids, values);

        emit CardStatusChanged(tokenId, CardStatus.Vaulted, CardStatus.Digital);
    }

    /**
     * @notice Transfer kartu antar user via marketplace — hanya untuk kartu Digital
     * @dev onlyOwner — backend yang memanggil (ADR-003, custodial model)
     * @param tokenId ID kartu yang ditransfer
     * @param from Alamat penjual (harus pemilik kartu saat ini)
     * @param to Alamat pembeli
     */
    function marketplaceTransfer(uint256 tokenId, address from, address to) external onlyOwner {
        require(cardStatus[tokenId] == CardStatus.Digital, "Card is not digital");
        require(balanceOf(from, tokenId) == 1, "Sender does not own card");

        uint256[] memory ids = new uint256[](1);
        ids[0] = tokenId;
        uint256[] memory values = new uint256[](1);
        values[0] = 1;
        _update(from, to, ids, values);

        lastOwner[tokenId] = to;

        emit MarketplaceTransfer(tokenId, from, to);
    }

    function recordVerification(uint256 tokenId, uint8 riskScore, bool flagged) external onlyOwner {
        require(riskScore <= 100, "Risk score out of range");
        lastRiskScore[tokenId] = riskScore;
        flaggedSuspicious[tokenId] = flagged;
        emit VerificationRecorded(tokenId, riskScore, flagged);
    }

    /**
     * @notice Burn kartu secara permanen — token dihancurkan, tidak bisa dipulihkan
     * @dev onlyOwner — backend yang memanggil (ADR-003, custodial model)
     * @dev Hanya kartu Digital yang bisa di-burn. _update() override sudah memblokir
     *      burn untuk kartu Vaulted karena _burn() memanggil _update(owner, address(0))
     *      dan from != address(0) akan trigger revert "Card is vaulted".
     * @param tokenId ID kartu yang akan di-burn
     * @param owner Alamat pemilik kartu saat ini
     */
    function burnCard(uint256 tokenId, address owner) external onlyOwner {
        require(cardStatus[tokenId] == CardStatus.Digital, "Card is not digital");
        require(balanceOf(owner, tokenId) == 1, "Owner does not hold card");

        Rarity rarity = cardRarity[tokenId];
        _burn(owner, tokenId, 1);

        emit CardBurned(tokenId, owner, uint8(rarity));
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

        // H-2 fix: update lastOwner on standard ERC1155 transfers
        for (uint256 i = 0; i < ids.length; i++) {
            if (from != address(0) && to != address(0)) {
                lastOwner[ids[i]] = to;
            }
        }
    }
}
