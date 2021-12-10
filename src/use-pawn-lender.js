import { useEffect, useState } from "react";
import { ethers } from "ethers";

import LegacyPromissoryNoteAbi from './abis/legacy-promissory-note.json';
import LegacyLoanCoreAbi from './abis/legacy-loan-core.json';
import PromissoryNoteAbi from './abis/promissory-note.json';
import LoanCoreAbi from './abis/loan-core.json';
import AssetWrapperAbi from './abis/asset-wrapper.json';
import FlashRolloverAbi from './abis/flash-rollover.json';
import ERC20Abi from './abis/erc20.json';
import ERC721Abi from './abis/erc721.json';
import ERC1155Abi from './abis/erc1155.json';

// export const addresses = {
//     legacy: {
//         lenderNote: '0xD96e4D03420aA33a3FE91f57D03D8Ef69dE1e863',
//         loanCore: '0x59e57F9A313A2EB1c7357eCc331Ddca14209F403',
//         repaymentController: '0x945afF9253C840401166c3d24fF78180Fe0A05df',
//         originationController: '0x0585a675029C68A6AF41Ba1350BC8172D6172320'
//     },
//     current: {
//         lenderNote: '0x6BD1476dD1D57f08670AF6720CA2eDf37B10746E',
//         loanCore: '0x606E4a441290314aEaF494194467Fd2Bb844064A',
//         repaymentController: '0x9eCE636e942bCb67f9E0b7B6C51A56570EF6F38d',
//         originationController: '0x7C2A27485B69f490945943464541236a025161F6'
//     },
//     common: {
//         assetWrapper: '0x1F563CDd688ad47b75E474FDe74E87C643d129b7',
//         flashRollover: '0x24611Fad669350cA869FBed4B62877d1a409dA12'
//     },
//     tokens: {
//         usdc: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
//         weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
//     }
// }

export const addresses = {
    legacy: {
        lenderNote: '0xD96e4D03420aA33a3FE91f57D03D8Ef69dE1e863',
        loanCore: '0x59e57F9A313A2EB1c7357eCc331Ddca14209F403',
        repaymentController: '0x945afF9253C840401166c3d24fF78180Fe0A05df',
        originationController: '0x0585a675029C68A6AF41Ba1350BC8172D6172320',
        borrowerNote: '0xF5F694eF895395D47EA820d05A4a7A4c079DE82f'
    },
    current: {
        lenderNote: '0x6BD1476dD1D57f08670AF6720CA2eDf37B10746E',
        loanCore: '0x606E4a441290314aEaF494194467Fd2Bb844064A',
        repaymentController: '0x9eCE636e942bCb67f9E0b7B6C51A56570EF6F38d',
        originationController: '0x7C2A27485B69f490945943464541236a025161F6',
        borrowerNote: '0x9B458e2B9c0Cd34A62A26B846f45Eb829aEbC96E'
    },
    common: {
        assetWrapper: '0x1F563CDd688ad47b75E474FDe74E87C643d129b7',
        flashRollover: '0x24611Fad669350cA869FBed4B62877d1a409dA12'
    },
    tokens: {
        usdc: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    }
}

export function usePawnLender(wallet) {
    window.wallet = wallet;

    const [chainInfo, setChainInfo] = useState(null);

    useEffect(() => {
        const getInfo = async () => {
            if (!wallet?.account) return;

            const { account } = wallet;
            const provider = new ethers.providers.Web3Provider(wallet.ethereum);

            // Find active loans
            // For lender note, check owned tokens - for each one, get the loan ID
            const legacyLenderNote = new ethers.Contract(addresses.legacy.lenderNote, LegacyPromissoryNoteAbi, provider);
            const lenderNote = new ethers.Contract(addresses.current.lenderNote, PromissoryNoteAbi, provider);
            const legacyBorrowerNote = new ethers.Contract(addresses.legacy.borrowerNote, LegacyPromissoryNoteAbi, provider);
            const borrowerNote = new ethers.Contract(addresses.current.borrowerNote, PromissoryNoteAbi, provider);
            const legacyLoanCore = new ethers.Contract(addresses.legacy.loanCore, LegacyLoanCoreAbi, provider);
            const loanCore = new ethers.Contract(addresses.current.loanCore, LoanCoreAbi, provider);
            const assetWrapper = new ethers.Contract(addresses.common.assetWrapper, AssetWrapperAbi, provider);
            const flashRollover = new ethers.Contract(addresses.common.flashRollover, FlashRolloverAbi, provider);

            const usdc = new ethers.Contract(addresses.tokens.usdc, ERC20Abi, provider);
            const weth = new ethers.Contract(addresses.tokens.weth, ERC20Abi, provider);

            const ethBalance = await provider.getBalance(account);
            const usdcBalance = await usdc.balanceOf(account);
            const wethBalance = await weth.balanceOf(account);

            const numLenderNotes = await lenderNote.balanceOf(account);
            const numLegacyLenderNotes = await legacyLenderNote.balanceOf(account);

            const loans = [];

            for (let i = 0; i < numLenderNotes; i++) {
                const lenderNoteId = await lenderNote.tokenOfOwnerByIndex(account, i);
                const loanId = await lenderNote.loanIdByNoteId(lenderNoteId);
                const loanData = await loanCore.getLoan(loanId);
                console.log("BORORWER NOTE ID", loanData.borrowerNoteId);

                // Active state
                if (loanData.state === 2) {
                    // const borrower = await borrowerNote.ownerOf(loanData.borrowerNoteId);
                    // console.log("BORORWER", borrower);
                    // Find collateral
                    const tokenId = loanData.terms.collateralTokenId;
                    const erc20Holdings = [];
                    const erc721Holdings = [];
                    const erc1155Holdings = [];

                    let failed = false;
                    let i = 0;
                    while (!failed) {
                        try {
                            const holding = await assetWrapper.bundleERC20Holdings(tokenId, i++);
                            const token = new ethers.Contract(holding.tokenAddress, ERC20Abi, provider);
                            const tokenName = await token.name();
                            const symbol = await token.symbol();
                            const decimals = await token.decimals();

                            erc20Holdings.push({
                                amount: holding.amount,
                                tokenAddress: holding.tokenAddress,
                                token,
                                tokenName,
                                symbol,
                                decimals
                            });
                        } catch (e) {
                            failed = true;
                        }
                    }

                    failed = false;
                    i = 0;
                    while (!failed) {
                        try {
                            const holding = await assetWrapper.bundleERC721Holdings(tokenId, i++);
                            const token = new ethers.Contract(holding.tokenAddress, ERC721Abi, provider);
                            const tokenName = await token.name();
                            const symbol = await token.symbol();

                            erc721Holdings.push({
                                tokenAddress: holding.tokenAddress,
                                tokenId: holding.tokenId,
                                token,
                                tokenName,
                                symbol
                            });
                        } catch (e) {
                            failed = true;
                        }
                    }

                    failed = false;
                    i = 0;
                    while (!failed) {
                        try {
                            const holding = await assetWrapper.bundleERC1155Holdings(tokenId, i++);
                            const token = new ethers.Contract(holding.tokenAddress, ERC1155Abi, provider);
                            const tokenName = await token.name();
                            const symbol = await token.symbol();

                            erc1155Holdings.push({
                                tokenAddress: holding.tokenAddress,
                                tokenId: holding.tokenId,
                                amount: holding.amount,
                                token,
                                tokenName,
                                symbol
                            });
                        } catch (e) {
                            failed = true;
                        }
                    }

                    const payableToken = new ethers.Contract(loanData.terms.payableCurrency, ERC20Abi, provider);

                    loans.push({
                        legacy: false,
                        loanId: loanId,
                        lender: account,
                        // borrower,
                        data: {
                            state: loanData.state,
                            dueDate: loanData.dueDate.toNumber(),
                            borrowerNoteId: loanData.borrowerNoteId.toNumber(),
                            lenderNoteId: loanData.lenderNoteId.toNumber()
                        },
                        terms: {
                            collateralTokenId: loanData.terms.collateralTokenId,
                            payableCurrency: loanData.terms.payableCurrency,
                            payableToken: payableToken,
                            payableTokenName: await payableToken.name(),
                            payableTokenSymbol: await payableToken.symbol(),
                            payableTokenDecimals: await payableToken.decimals(),
                            durationSecs: loanData.terms.durationSecs,
                            principal: loanData.terms.principal,
                            interest: loanData.terms.interest
                        },
                        collateral: {
                            erc20: erc20Holdings,
                            erc721: erc721Holdings,
                            erc1155: erc1155Holdings,
                        }
                    });
                }
            }

            for (let i = 0; i < numLegacyLenderNotes; i++) {
                const lenderNoteId = await legacyLenderNote.tokenOfOwnerByIndex(account, i);
                const loanId = await legacyLenderNote.loanIdByNoteId(lenderNoteId);
                const loanData = await legacyLoanCore.getLoan(loanId);

                // Active state
                if (loanData.state === 2) {
                    // const borrower = await legacyBorrowerNote.ownerOf(loanData.borrowerNoteId);
                    // Find collateral
                    const tokenId = loanData.terms.collateralTokenId;
                    const erc20Holdings = [];
                    const erc721Holdings = [];
                    const erc1155Holdings = [];

                    let failed = false;
                    let i = 0;
                    while (!failed) {
                        try {
                            const holding = await assetWrapper.bundleERC20Holdings(tokenId, i++);
                            const token = new ethers.Contract(holding.tokenAddress, ERC20Abi, provider);
                            const tokenName = await token.name();
                            const symbol = await token.symbol();
                            const decimals = await token.decimals();

                            erc20Holdings.push({
                                amount: holding.amount,
                                tokenAddress: holding.tokenAddress,
                                token,
                                tokenName,
                                symbol,
                                decimals
                            });
                        } catch (e) {
                            failed = true;
                        }
                    }

                    failed = false;
                    i = 0;
                    while (!failed) {
                        try {
                            const holding = await assetWrapper.bundleERC721Holdings(tokenId, i++);
                            const token = new ethers.Contract(holding.tokenAddress, ERC721Abi, provider);
                            const tokenName = await token.name();
                            const symbol = await token.symbol();

                            erc721Holdings.push({
                                tokenAddress: holding.tokenAddress,
                                tokenId: holding.tokenId,
                                token,
                                tokenName,
                                symbol
                            });
                        } catch (e) {
                            failed = true;
                        }
                    }

                    failed = false;
                    i = 0;
                    while (!failed) {
                        try {
                            const holding = await assetWrapper.bundleERC1155Holdings(tokenId, i++);
                            const token = new ethers.Contract(holding.tokenAddress, ERC1155Abi, provider);
                            const tokenName = await token.name();
                            const symbol = await token.symbol();

                            erc1155Holdings.push({
                                tokenAddress: holding.tokenAddress,
                                tokenId: holding.tokenId,
                                amount: holding.amount,
                                token,
                                tokenName,
                                symbol
                            });
                        } catch (e) {
                            failed = true;
                        }
                    }

                    const payableToken = new ethers.Contract(loanData.terms.payableCurrency, ERC20Abi, provider);

                    loans.push({
                        legacy: true,
                        loanId: loanId,
                        lender: account,
                        // borrower,
                        data: {
                            state: loanData.state,
                            dueDate: loanData.dueDate.toNumber(),
                            borrowerNoteId: loanData.borrowerNoteId.toNumber(),
                            lenderNoteId: loanData.lenderNoteId.toNumber()
                        },
                        terms: {
                            collateralTokenId: loanData.terms.collateralTokenId,
                            payableCurrency: loanData.terms.payableCurrency,
                            payableToken: payableToken,
                            payableTokenName: await payableToken.name(),
                            payableTokenSymbol: await payableToken.symbol(),
                            payableTokenDecimals: await payableToken.decimals(),
                            durationSecs: loanData.terms.durationSecs,
                            principal: loanData.terms.principal,
                            interest: loanData.terms.interest
                        },
                        collateral: {
                            erc20: erc20Holdings,
                            erc721: erc721Holdings,
                            erc1155: erc1155Holdings,
                        }
                    });
                }
            }

            const info = {
                account,
                balances: {
                    eth: ethBalance,
                    usdc: usdcBalance,
                    weth: wethBalance
                },
                loans,
                contracts: {
                    legacyLenderNote,
                    lenderNote,
                    legacyLoanCore,
                    loanCore,
                    assetWrapper,
                    flashRollover
                },
                contractAddresses: addresses
            }

            setChainInfo(Object.assign({ ...chainInfo }, info));
        };

        getInfo();
    }, [wallet]);

    // const ethBalance = await ethers.provider.getBalance()

    // For each loan, get all owned assets


    // Return active loans
    // Return contract addresses
    return chainInfo;
}