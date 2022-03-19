import {
    useState,
    useContext,
    useCallback,
    useEffect,
    createContext,
} from 'react';
import { ethers } from 'ethers';
import { useLocalStorage } from 'react-use';

const initialWallet = {
    account: '',
    provider: null,
    noMetamask: false,
    networkId: null,
    error: false,
};

const initialContext = {
    wallet: initialWallet,
};

const mainnet = '137';

const WalletContext = createContext(initialContext);

export const WalletProvider = ({
    children,
}) => {
    const ethereum = window.ethereum;
    const [wallet, setWallet] = useState(initialWallet);
    const [connected, setConnected] = useLocalStorage('connected', false);

    useEffect(() => {
        if (ethereum) {
            const handleNetworkChange = (networkId) => {
                console.log('network changed', networkId);
                setWallet({ ...wallet, networkId: networkId });
            };

            const handleAccountChange = (accounts) => {
                const [account] = accounts;
                if (account) {
                    const walletObj = {
                        account,
                        noMetamask: false,
                        provider: window.ethereum,
                        networkId: ethereum.networkVersion,
                        error: false,
                    };

                    setWallet(walletObj);
                }
            };
            ethereum.on('accountsChanged', handleAccountChange);
            ethereum.on('networkChanged', handleNetworkChange);

            return () => {
                ethereum.removeListener('accountsChanged', handleAccountChange);
                ethereum.removeListener('networkChanged', handleNetworkChange);
            };
        }
    }, [ethereum, wallet]);

    const connectMetaMask = useCallback(async () => {
        if (!ethereum) {
            setWallet({ ...wallet, noMetamask: true });
            return;
        }

        const accounts = await ethereum.request({
            method: 'eth_requestAccounts',
        });
        const [account] = accounts;
        const walletObj = {
            account,
            provider: (window).ethereum,
            networkId: (window).ethereum.networkVersion,
            noMetamask: false,
            error: false,
        };
        setConnected(true);
        setWallet(walletObj);
    }, [ethereum, setConnected, wallet]);

    useEffect(() => {
        connected && connectMetaMask();
    }, [connectMetaMask, connected]);

    return (
        <WalletContext.Provider value={{ wallet, connectMetaMask }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    return useContext(WalletContext);
};