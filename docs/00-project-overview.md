# Project Overview — Gachard

## Problem
Kolektor kartu fisik menghadapi grading otentikasi yang mahal dan tidak pasti hasilnya (mis. PSA), sementara kartu digital sulit dibuktikan keasliannya dan riwayat kepemilikannya.

## Solution
Gachard adalah platform di mana brand/IP (via licensee atau invite) menerbitkan kartu TCG digital-native (Battle Card / Collection Card). User membeli card pack, reveal kartu (tercatat sebagai NFT tersembunyi di balik UX aplikasi biasa), bisa meminta cetak fisik (kartu terkunci di Vault Gachard, bukan di-burn), dan redeem kembali ke digital dengan merusak kartu fisik secara permanen.

## Differentiator
Berbeda dengan platform seperti Courtyard yang men-tokenisasi kartu fisik yang sudah ada, Gachard menciptakan kartu digital-native sejak lahir — dengan mekanisme lock-vault-redeem yang menjaga riwayat/provenance dalam satu token ID, bukan burn-and-remint.

## Users
End-user pembeli/kolektor kartu (rencana beta fokus Amerika Serikat; versi hackathon: demo umum). User tidak perlu tahu istilah wallet, gas fee, atau NFT — semua tersembunyi di balik UX seperti aplikasi konsumen biasa.

## Scope (Hackathon)
Lihat PRD lengkap (`PRD-Gachard-Hackathon.md`) §9 untuk detail Scope IN/OUT. Ringkasnya: login + wallet custodial, mint pack (Standard 5 kartu / Booster 10 kartu), vault/print/redeem loop, scan & verify berbasis QR lookup on-chain, sistem credit (pembayaran disimulasikan, belum ada payment gateway sungguhan), marketplace fungsional dengan currency Crystal (trade + FVM floor 70% + fee 8%), dismantle & crystal (burn-to-earn), dan AI anomaly detection oracle untuk trade.

## Track & Chain
**Track**: Consumer Apps — Indonesia Web3 Hackathon 2026 (kolaborasi Binance Academy, BNB Chain, Coinvestasi, Dev Web3 Jogja).
**Chain**: BNB Chain Testnet / opBNB Testnet.
**Elemen AI**: seluruh komponen AI saat ini **dimatikan** lewat flag `ENABLE_AI` (ADR-030) atas keputusan pemilik project. Kodenya tetap ada dan bisa dihidupkan kembali tanpa deploy ulang: AI Anomaly Detection Oracle untuk wash-trading dengan hasil dicatat on-chain (ADR-025), serta market insight dan price suggestion (Gemini, ADR-024). AI vision untuk scan kartu terpisah dan sudah lebih dulu ditunda (ADR-022) — verifikasi kartu memakai QR lookup on-chain vs database.
