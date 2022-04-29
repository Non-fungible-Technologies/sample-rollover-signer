import { useEffect } from "react";
import { useSigner, useContract, erc20ABI, useWaitForTransaction } from "wagmi";
import { addresses } from "./config";
import { toast } from "react-toastify";
import { ethers } from "ethers";

export const useApproveERC20 = ({ tokenAddress, spender }) => {
  const [{ data: signer }] = useSigner();
  const erc20Contract = useContract({
    addressOrName: tokenAddress,
    contractInterface: erc20ABI,
    signerOrProvider: signer,
  });
  // eslint-disable-next-line no-unused-vars
  const [_, wait] = useWaitForTransaction({
    skip: true,
  });

  const doApprove = async () => {
    console.log(`approving ${spender} to spend ${tokenAddress}`);
    try {
      const { hash } = await erc20Contract.approve(
        spender,
        ethers.constants.MaxInt256
      );

      const waitForApproval = wait({ confirmations: 1, hash });
      const response = await toast.promise(waitForApproval, {
        pending: "Approving ERC20...",
        success: "ERC20 Approved",
        error: "Failed to Approve ERC20",
      });

      console.log({ response });
    } catch (e) {
      toast.error(e);
    }
  };

  return { doApprove };
};
