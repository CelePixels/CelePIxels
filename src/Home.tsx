import { useEffect, useState } from "react";
import styled from "styled-components";
import confetti from "canvas-confetti";
import * as anchor from "@project-serum/anchor";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { GatewayProvider } from '@civic/solana-gateway-react';
import Countdown from "react-countdown";
import { Snackbar, Paper, LinearProgress, Chip } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import { toDate, AlertState, getAtaForMint } from './utils';
import { MintButton } from './MintButton';
import {
    CandyMachine,
    awaitTransactionSignatureConfirmation,
    getCandyMachineState,
    mintOneToken,
    CANDY_MACHINE_PROGRAM,
} from "./candy-machine";

const cluster = process.env.REACT_APP_SOLANA_NETWORK!.toString();
const decimals = process.env.REACT_APP_SPL_TOKEN_TO_MINT_DECIMALS ? +process.env.REACT_APP_SPL_TOKEN_TO_MINT_DECIMALS!.toString() : 9;
const splTokenName = process.env.REACT_APP_SPL_TOKEN_TO_MINT_NAME ? process.env.REACT_APP_SPL_TOKEN_TO_MINT_NAME.toString() : "TOKEN";

const WalletContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
`;

const WalletAmount = styled.div`
  color: black;
  width: auto;
  padding: 5px 5px 5px 16px;
  min-width: 48px;
  min-height: auto;
  border-radius: 22px;
  background-color: var(--main-text-color);
  box-shadow: 0px 3px 5px -1px rgb(0 0 0 / 20%), 0px 6px 10px 0px rgb(0 0 0 / 14%), 0px 1px 18px 0px rgb(0 0 0 / 12%);
  box-sizing: border-box;
  transition: background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, border 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
  font-weight: 500;
  line-height: 1.75;
  text-transform: uppercase;
  border: 0;
  margin: 0;
  display: inline-flex;
  outline: 0;
  position: relative;
  align-items: center;
  user-select: none;
  vertical-align: middle;
  justify-content: flex-start;
  gap: 10px;
`;

const Wallet = styled.ul`
  flex: 0 0 auto;
  margin: 0;
  padding: 0;
`;

const ConnectButton = styled(WalletMultiButton)`
  border-radius: 18px !important;
  padding: 6px 16px;
  background-color: #4E44CE;
  margin: 0 auto;
`;

const NFT = styled(Paper)`
  min-width: 400px;
  padding: 5px 20px 20px 20px;
  flex: 1 1 auto;
  background-color: var(--card-background-color) !important;
  opacity: 1;
  border-radius: 30px;
  user-select: none;
`;

const Card = styled(Paper)`
  display: inline-block;
  background-color: var(--card-background-lighter-color) !important;
  margin: 5px;
  padding: 24px;
`;

const MintButtonContainer = styled.div`
  button.MuiButton-contained:not(.MuiButton-containedPrimary).Mui-disabled {
    color: #464646;
  }

  button.MuiButton-contained:not(.MuiButton-containedPrimary):hover,
  button.MuiButton-contained:not(.MuiButton-containedPrimary):focus {
    -webkit-animation: pulse 1s;
    animation: pulse 1s;
    box-shadow: 0 0 0 2em rgba(255, 255, 255, 0);
  }

  @-webkit-keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 #ef8f6e;
    }
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 #ef8f6e;
    }
  }
`;

const Logo = styled.div`
  flex: 0 0 auto;

  img {
    height: 60px;
  }
`;
const Menu = styled.ul`
  list-style: none;
  display: inline-flex;
  flex: 1 0 auto;

  li {
    margin: 0 12px;

    a {
      color: var(--main-text-color);
      list-style-image: none;
      list-style-position: outside;
      list-style-type: none;
      outline: none;
      text-decoration: none;
      text-size-adjust: 100%;
      touch-action: manipulation;
      transition: color 0.3s;
      padding-bottom: 15px;

      img {
        max-height: 26px;
      }
    }

    a:hover, a:active {
      color: rgb(131, 146, 161);
      border-bottom: 4px solid var(--title-text-color);
    }

  }
`;
const Menu2 = styled.ul`
  list-style: none;
  display: inline-flex;
  flex: 1 0 auto;
  align-items: right;
  justify-content: right;

  li {
    margin: 0 12px;
    align-items: right;

    a {
      color: var(--main-text-color);
      list-style-image: none;
      list-style-position: outside;
      list-style-type: none;
      outline: none;
      text-decoration: none;
      text-size-adjust: 100%;
      touch-action: manipulation;
      transition: color 0.3s;
      padding-bottom: 15px;

      img {
        max-height: 26px;
      }
    }

    a:hover, a:active {
      color: rgb(131, 146, 161);
      border-bottom: 4px solid var(--title-text-color);
    }

  }
`;

const SolExplorerLink = styled.a`
  color: var(--title-text-color);
  border-bottom: 1px solid var(--title-text-color);
  font-weight: bold;
  list-style-image: none;
  list-style-position: outside;
  list-style-type: none;
  outline: none;
  text-decoration: none;
  text-size-adjust: 100%;

  :hover {
    border-bottom: 2px solid var(--title-text-color);
  }
`;

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 20px;
  margin-bottom: 20px;
  margin-right: 4%;
  margin-left: 4%;
  text-align: center;
  justify-content: center;
`;

const MintContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 20px;
`;

const DesContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 20px;
`;

const Price = styled(Chip)`
  position: absolute;
  margin: 5px;
  font-weight: bold;
  font-size: 1em !important;
`;

const Image = styled.img`
  height: 400px;
  width: auto;
  border-radius: 7px;
  box-shadow: 5px 5px 40px 5px rgba(0,0,0,0.5);
`;

const BorderLinearProgress = styled(LinearProgress)`
  margin: 20px 0;
  height: 10px !important;
  border-radius: 30px;
  border: 2px solid white;
  box-shadow: 5px 5px 40px 5px rgba(0,0,0,0.5);
  background-color:var(--main-text-color) !important;
  
  > div.MuiLinearProgress-barColorPrimary{
    background-color:var(--title-text-color) !important;
  }

  > div.MuiLinearProgress-bar1Determinate {
    border-radius: 30px !important;
    background-image: linear-gradient(270deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0.5));
  }
`;

const ShimmerTitle = styled.h1`
  margin: 50px auto;
  text-transform: uppercase;
  animation: glow .2s ease-in-out infinite alternate;
  color: var(--main-text-color);
  @keyframes glow {
    from {
      text-shadow: 0 0 20px var(--main-text-color);
    }
    to {
      text-shadow: 0 0 40px var(--title-text-color), 0 0 10px var(--title-text-color);
    }
  }
`;

const GoldTitle = styled.h2`
  color: var(--title-text-color);
`;

const LogoAligner = styled.div`
  display: flex;
  align-items: center;
  img {
    max-height: 35px;
    margin-right: 10px;
  }
`;



export interface HomeProps {
    candyMachineId: anchor.web3.PublicKey;
    connection: anchor.web3.Connection;
    txTimeout: number;
    rpcHost: string;
}

const Home = (props: HomeProps) => {
    const [balance, setBalance] = useState<number>();
    const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT
    const [isActive, setIsActive] = useState(false); // true when countdown completes or whitelisted
    const [solanaExplorerLink, setSolanaExplorerLink] = useState<string>("");
    const [itemsAvailable, setItemsAvailable] = useState(0);
    const [itemsRedeemed, setItemsRedeemed] = useState(0);
    const [itemsRemaining, setItemsRemaining] = useState(0);
    const [isSoldOut, setIsSoldOut] = useState(false);
    const [payWithSplToken, setPayWithSplToken] = useState(false);
    const [price, setPrice] = useState(0);
    const [priceLabel, setPriceLabel] = useState<string>("SOL");
    const [whitelistPrice, setWhitelistPrice] = useState(0);
    const [whitelistEnabled, setWhitelistEnabled] = useState(false);
    const [whitelistTokenBalance, setWhitelistTokenBalance] = useState(0);

    const [alertState, setAlertState] = useState<AlertState>({
        open: false,
        message: "",
        severity: undefined,
    });

    const wallet = useAnchorWallet();
    const [candyMachine, setCandyMachine] = useState<CandyMachine>();

    const rpcUrl = props.rpcHost;

    const refreshCandyMachineState = () => {
        (async () => {
            if (!wallet) return;

            const cndy = await getCandyMachineState(
                wallet as anchor.Wallet,
                props.candyMachineId,
                props.connection
            );

            setCandyMachine(cndy);
            setItemsAvailable(cndy.state.itemsAvailable);
            setItemsRemaining(cndy.state.itemsRemaining);
            setItemsRedeemed(cndy.state.itemsRedeemed);

            var divider = 1;
            if (decimals) {
                divider = +('1' + new Array(decimals).join('0').slice() + '0');
            }

            // detect if using spl-token to mint
            if (cndy.state.tokenMint) {
                setPayWithSplToken(true);
                // Customize your SPL-TOKEN Label HERE
                // TODO: get spl-token metadata name
                setPriceLabel(splTokenName);
                setPrice(cndy.state.price.toNumber() / divider);
                setWhitelistPrice(cndy.state.price.toNumber() / divider);
            } else {
                setPrice(cndy.state.price.toNumber() / LAMPORTS_PER_SOL);
                setWhitelistPrice(cndy.state.price.toNumber() / LAMPORTS_PER_SOL);
            }


            // fetch whitelist token balance
            if (cndy.state.whitelistMintSettings) {
                setWhitelistEnabled(true);
                if (cndy.state.whitelistMintSettings.discountPrice !== null && cndy.state.whitelistMintSettings.discountPrice !== cndy.state.price) {
                    if (cndy.state.tokenMint) {
                        setWhitelistPrice(cndy.state.whitelistMintSettings.discountPrice?.toNumber() / divider);
                    } else {
                        setWhitelistPrice(cndy.state.whitelistMintSettings.discountPrice?.toNumber() / LAMPORTS_PER_SOL);
                    }
                }
                let balance = 0;
                try {
                    const tokenBalance =
                        await props.connection.getTokenAccountBalance(
                            (
                                await getAtaForMint(
                                    cndy.state.whitelistMintSettings.mint,
                                    wallet.publicKey,
                                )
                            )[0],
                        );

                    balance = tokenBalance?.value?.uiAmount || 0;
                } catch (e) {
                    console.error(e);
                    balance = 0;
                }
                setWhitelistTokenBalance(balance);
                setIsActive(balance > 0);
            } else {
                setWhitelistEnabled(false);
            }
        })();
    };

    const renderCounter = ({ days, hours, minutes, seconds }: any) => {
        return (
            <div><Card elevation={1}><h1>{days}</h1><br />Days</Card><Card elevation={1}><h1>{hours}</h1>
                <br />Hours</Card><Card elevation={1}><h1>{minutes}</h1><br />Mins</Card><Card elevation={1}>
                    <h1>{seconds}</h1><br />Secs</Card></div>
        );
    };

    function displaySuccess(mintPublicKey: any): void {
        let remaining = itemsRemaining - 1;
        setItemsRemaining(remaining);
        setIsSoldOut(remaining === 0);
        if (whitelistTokenBalance && whitelistTokenBalance > 0) {
            let balance = whitelistTokenBalance - 1;
            setWhitelistTokenBalance(balance);
            setIsActive(balance > 0);
        }
        setItemsRedeemed(itemsRedeemed + 1);
        const solFeesEstimation = 0.012; // approx
        if (!payWithSplToken && balance && balance > 0) {
            setBalance(balance - (whitelistEnabled ? whitelistPrice : price) - solFeesEstimation);
        }
        setSolanaExplorerLink(cluster === "devnet" || cluster === "testnet"
            ? ("https://explorer.solana.com/address/" + mintPublicKey + "?cluster=" + cluster)
            : ("https://explorer.solana.com/address/" + mintPublicKey));
        throwConfetti();
    };

    function throwConfetti(): void {
        confetti({
            particleCount: 400,
            spread: 70,
            origin: { y: 0.6 },
        });
    }

    const onMint = async () => {
        try {
            setIsMinting(true);
            if (wallet && candyMachine?.program && wallet.publicKey) {
                const mint = anchor.web3.Keypair.generate();
                const mintTxId = (
                    await mintOneToken(candyMachine, wallet.publicKey, mint)
                )[0];

                let status: any = { err: true };
                if (mintTxId) {
                    status = await awaitTransactionSignatureConfirmation(
                        mintTxId,
                        props.txTimeout,
                        props.connection,
                        'singleGossip',
                        true,
                    );
                }

                if (!status?.err) {
                    setAlertState({
                        open: true,
                        message: 'Congratulations! Mint succeeded!',
                        severity: 'success',
                    });

                    // update front-end amounts
                    displaySuccess(mint.publicKey);
                } else {
                    setAlertState({
                        open: true,
                        message: 'Mint failed! Please try again!',
                        severity: 'error',
                    });
                }
            }
        } catch (error: any) {
            // TODO: blech:
            let message = error.msg || 'Minting failed! Please try again!';
            if (!error.msg) {
                if (!error.message) {
                    message = 'Transaction Timeout! Please try again.';
                } else if (error.message.indexOf('0x138')) {
                } else if (error.message.indexOf('0x137')) {
                    message = `SOLD OUT!`;
                } else if (error.message.indexOf('0x135')) {
                    message = `Insufficient funds to mint. Please fund your wallet.`;
                }
            } else {
                if (error.code === 311) {
                    message = `SOLD OUT!`;
                } else if (error.code === 312) {
                    message = `Minting period hasn't started yet.`;
                }
            }

            setAlertState({
                open: true,
                message,
                severity: "error",
            });
        } finally {
            setIsMinting(false);
        }
    };


    useEffect(() => {
        (async () => {
            if (wallet) {
                const balance = await props.connection.getBalance(wallet.publicKey);
                setBalance(balance / LAMPORTS_PER_SOL);
            }
        })();
    }, [wallet, props.connection]);

    useEffect(refreshCandyMachineState, [
        wallet,
        props.candyMachineId,
        props.connection,
    ]);

    return (
        <main>
            <MainContainer>
                <WalletContainer>
                    <Logo><a href="http://localhost:3000/" target="_blank" rel="noopener noreferrer"><img alt=""
                        src="logo.png" /></a></Logo>
                    <Menu>
                        <li><a href="https://discord.gg/KHd2rYpv" target="_blank" rel="noopener noreferrer">Discord</a>
                        </li>
                        <ShimmerTitle>MINT IS LIVE !</ShimmerTitle>
                    </Menu>
                    <Wallet>
                        {wallet ?
                            <WalletAmount>{(balance || 0).toLocaleString()} SOL<ConnectButton /></WalletAmount> :
                            <ConnectButton>Connect Wallet</ConnectButton>}
                    </Wallet>
                </WalletContainer>
                <br />


                <MintContainer>
                    <DesContainer>
                        <NFT elevation={3}>
                            <h2>CelePixel</h2>
                            <br />
                            <div><Price
                                label={isActive && whitelistEnabled && (whitelistTokenBalance > 0) ? (whitelistPrice + " " + priceLabel) : (price + " " + priceLabel)} /><Image
                                    src="celepixel.gif"
                                    alt="NFT To Mint" /></div>
                            <br />
                            <p>Celebrity Pixels is a 1/1 collection of 300 unique avatars of world-famous celebrities with their uniquely famous attributes. Get yourself an avatar to show your support on social media with the
                                perfectly balanced pixels all while receiving great rewards for holding such as 50% Royalties, Alpha Calls, DAO Voting Priority etc.
                            </p>
                            {wallet && isActive && whitelistEnabled && (whitelistTokenBalance > 0) &&
                                <h3>You have {whitelistTokenBalance} whitelist mint(s) remaining.</h3>}
                            {wallet && isActive &&
                                /* <p>Total Minted : {100 - (itemsRemaining * 100 / itemsAvailable)}%</p>}*/
                                <h3>TOTAL MINTED : {itemsRedeemed} / {itemsAvailable}</h3>}
                            {wallet && isActive && <BorderLinearProgress variant="determinate"
                                value={100 - (itemsRemaining * 100 / itemsAvailable)} />}
                            <br />
                            <MintButtonContainer>
                                {!isActive && candyMachine?.state.goLiveDate ? (
                                    <Countdown
                                        date={toDate(candyMachine?.state.goLiveDate)}
                                        onMount={({ completed }) => completed && setIsActive(true)}
                                        onComplete={() => {
                                            setIsActive(true);
                                        }}
                                        renderer={renderCounter}
                                    />) : (
                                    !wallet ? (
                                        <ConnectButton>Connect Wallet</ConnectButton>
                                    ) :
                                        candyMachine?.state.gatekeeper &&
                                            wallet.publicKey &&
                                            wallet.signTransaction ? (
                                            <GatewayProvider
                                                wallet={{
                                                    publicKey:
                                                        wallet.publicKey ||
                                                        new PublicKey(CANDY_MACHINE_PROGRAM),
                                                    //@ts-ignore
                                                    signTransaction: wallet.signTransaction,
                                                }}
                                                // // Replace with following when added
                                                // gatekeeperNetwork={candyMachine.state.gatekeeper_network}
                                                gatekeeperNetwork={
                                                    candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                                                } // This is the ignite (captcha) network
                                                /// Don't need this for mainnet
                                                clusterUrl={rpcUrl}
                                                options={{ autoShowModal: false }}
                                            >
                                                <MintButton
                                                    candyMachine={candyMachine}
                                                    isMinting={isMinting}
                                                    isActive={isActive}
                                                    isSoldOut={isSoldOut}
                                                    onMint={onMint}
                                                />
                                            </GatewayProvider>
                                        ) : (
                                            <MintButton
                                                candyMachine={candyMachine}
                                                isMinting={isMinting}
                                                isActive={isActive}
                                                isSoldOut={isSoldOut}
                                                onMint={onMint}
                                            />
                                        ))}
                            </MintButtonContainer>
                            <br />
                            {wallet && isActive && solanaExplorerLink &&
                                <SolExplorerLink href={solanaExplorerLink} target="_blank">View on Solana
                                    Explorer</SolExplorerLink>}
                        </NFT>
                    </DesContainer>
                    <DesContainer>
                        <NFT elevation={3}>
                            <h1>RoadMap</h1>
                            <p>Stage 1: Art Development & Marketing</p>
                            <br></br>
                            <p>Stage 2: Listing on Popular Secondary Marketplace</p>
                            <br></br>
                            <p>Stage 3: Engagement With Cele Community</p>
                            <br></br>
                            <p>Stage 4: GRAPE Verification</p>
                            <br></br>
                            <p>Stage 5: First Royalty Airdrop</p>
                            <br></br>
                            <p>Stage 6: DAO Voting</p>
                            <br></br>
                            <p>Stage 7: Cele Holders Inclusive Merchandise</p>
                        </NFT>
                    </DesContainer>
                    <DesContainer>
                        <NFT elevation={4}>
                            <h1>Details</h1>
                            <p>Art Development of the project and advertizing it on various social media platforms to build a CELE Community.</p>
                            <p>Striving to be listed on popular secondary marketplaces such as <a href="https://alpha.art">Alphaart</a>, <a href="https://magiceden.io/ ">MagicEden</a>, <a href="https://solanart.io/ "> Solanart</a>, <a href="https://solsea.io/">Solsea</a> etc.</p>
                            <p>Engaging with the CELE Community with weekly games, karoke nights, giveaways, etc. </p>
                            <p>Grape verifaction will utilized to connect the Cele Holders together to bring further less contrast between them; also being able to participate in future giveaways and voting.</p>
                            <p>50% of all Cele secondary market profits are distributed to holders throughout the weeks coming.
                                This will be given out through $SOL airdrop and Organised Floor sweeping.</p>
                            <p>Take part in voting on the next business venture or submit your own idea. Every wallet gets one vote regardless of the amount of celes. Whales are great,
                                but they should not be the deciding factor of our community.</p>
                            <p>Mint Revenue is to be allocated towards the future stages of the project as per the decision of the Cele Community; We are far more than just a project, we will dominate the NFT space.</p>
                            <p>The team will release merchandise in the near future exclusive to CelePixel Holders. This will be used to further fund our expenses in the environment.</p>
                            <p>As a team, we think there shouldn't be any rarity in the project, as it shows clear bias to certain traits of the avatars; Beauty is in everything so we let the CELE Community decide to pick the ones that they think is more appealing to them.</p>
                        </NFT>
                    </DesContainer>
                    <NFT elevation={3}>
                        <LogoAligner><GoldTitle><Menu>
                            <li><img src="DiscordOrig.ico" alt=""></img><a href="https://discord.gg/KHd2rYpv" target="_blank" rel="noopener noreferrer">Discord</a>
                            </li>
                            <li><img src="Twitter.png" alt=""></img><a href="https://twitter.com/CelePixel" target="_blank" rel="noopener noreferrer">Twitter</a>
                            </li>
                        </Menu><Menu2><li><a href="http://celepixel.tk/tos" target="_blank" rel="noopener noreferrer">Terms of Service</a></li></Menu2></GoldTitle></LogoAligner>
                    </NFT>
                </MintContainer>
            </MainContainer>
            <Snackbar
                open={alertState.open}
                autoHideDuration={6000}
                onClose={() => setAlertState({ ...alertState, open: false })}
            >
                <Alert
                    onClose={() => setAlertState({ ...alertState, open: false })}
                    severity={alertState.severity}
                >
                    {alertState.message}
                </Alert>
            </Snackbar>
        </main>
    );
};

export default Home;
