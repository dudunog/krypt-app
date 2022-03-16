import {
  useEffect,
  useState,
  ReactNode,
  createContext,
  ChangeEvent,
  Dispatch,
  SetStateAction,
} from "react";
import { ethers } from "ethers";
import { contractABI, contractAddress } from "../utils/constants";

interface TransactionContextData {
  connectWallet: () => void;
  currentAccount: string;
  formData: FormDataProps;
  setFormData: Dispatch<SetStateAction<FormDataProps>>;
  handleChange: (e: ChangeEvent<HTMLInputElement>, name: string) => void;
  sendTransaction: () => void;
}

export const TransactionContext = createContext({} as TransactionContextData);

const { ethereum } = window as any;

const getEthereumContract = () => {
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer = provider.getSigner();
  const transactionContract = new ethers.Contract(
    contractAddress,
    contractABI,
    signer
  );

  return transactionContract;
};

interface TransactionProviderProps {
  children: ReactNode;
}

interface FormDataProps {
  addressTo: string;
  amount: string;
  keyword: string;
  message: string;
}

export const TransactionProvider = ({ children }: TransactionProviderProps) => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [formData, setFormData] = useState({} as FormDataProps);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState(
    localStorage.getItem("transactionCount")
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>, name: string) => {
    setFormData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };

  const checkIfWalletIsConnected = async () => {
    try {
      if (!ethereum) return alert("Please install metamask");

      const accounts = await ethereum.request({ method: "eth_accounts" });

      if (accounts.length) {
        setCurrentAccount(accounts[0]);

        //getAllTransactions();
      } else {
        console.log("No accounts found");
      }
    } catch (error) {
      console.log(error);

      throw new Error("No ethereum object");
    }
  };

  const connectWallet = async () => {
    try {
      if (!ethereum) return alert("Please install metamask");

      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);

      throw new Error("No ethereum object");
    }
  };

  const sendTransaction = async () => {
    try {
      if (!ethereum) return alert("Please install metamask");

      const { addressTo, amount, keyword, message } = formData;

      const transactionContract = getEthereumContract();
      const parsedAmount = ethers.utils.parseEther(amount);

      await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: currentAccount,
            to: addressTo,
            gas: "0x5208", // 21000 GWEI
            value: parsedAmount._hex,
          },
        ],
      });

      const transactionHash = transactionContract.addToBlockchain(
        addressTo,
        parsedAmount,
        message,
        keyword
      );

      setIsLoading(true);
      console.log(`Loading: ${transactionHash.hash}`);
      await transactionHash.wait();

      console.log(`Sucess: ${transactionHash.hash}`);
      setIsLoading(false);

      const transactionCount = await transactionContract.getTransactionCount();
      setTransactionCount(transactionCount.toNumber());
    } catch (error) {
      console.log(error);

      throw new Error("No ethereum object");
    }
  };

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  return (
    <TransactionContext.Provider
      value={{
        connectWallet,
        currentAccount,
        formData,
        setFormData,
        handleChange,
        sendTransaction,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
