// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Arcade Flappy Scoreboard + Badge
/// @notice Guarda o melhor score de cada jogador e permite mintar um badge ERC721
///         quando o jogador atingir um score mínimo.
contract ArcadeScoreboard is ERC721, Ownable {
    struct PlayerInfo {
        uint256 bestScore;
        bool hasBadge;
    }

    mapping(address => PlayerInfo) public players;

    /// @notice Pontuação mínima para poder mintar o badge
    uint256 public immutable badgeThreshold;

    /// @notice Próximo tokenId a ser mintado
    uint256 public nextTokenId;

    event ScoreSubmitted(address indexed player, uint256 score, uint256 bestScore);
    event BadgeMinted(address indexed player, uint256 tokenId);

    /// @param _badgeThreshold Score mínimo para mintar o badge (ex: 100)
    constructor(uint256 _badgeThreshold) ERC721("Arcade Flappy Badge", "FLAPPY") Ownable(msg.sender) {
        require(_badgeThreshold > 0, "Threshold must be > 0");
        badgeThreshold = _badgeThreshold;
    }

    /// @notice Registra um score para o jogador chamador.
    /// @dev Atualiza apenas se for maior que o bestScore atual.
    function submitScore(uint256 score) external {
        require(score > 0, "Score must be > 0");

        PlayerInfo storage info = players[msg.sender];

        if (score > info.bestScore) {
            info.bestScore = score;
        }

        emit ScoreSubmitted(msg.sender, score, info.bestScore);
    }

    /// @notice Permite ao jogador mintar um badge caso tenha atingido o score mínimo.
    function mintBadge() external {
        PlayerInfo storage info = players[msg.sender];

        require(info.bestScore >= badgeThreshold, "Score too low for badge");
        require(!info.hasBadge, "Badge already minted");

        uint256 tokenId = ++nextTokenId;
        info.hasBadge = true;

        _safeMint(msg.sender, tokenId);

        emit BadgeMinted(msg.sender, tokenId);
    }

    /// @notice Retorna o melhor score de um jogador.
    function getBestScore(address player) external view returns (uint256) {
        return players[player].bestScore;
    }

    /// @notice Retorna se o jogador já tem badge.
    function hasBadge(address player) external view returns (bool) {
        return players[player].hasBadge;
    }
}

