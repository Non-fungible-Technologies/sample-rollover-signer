import RepaymentControllerAbi from "./abis/repayment-controller.json";
import { useSigner, useContract, erc20ABI, useWaitForTransaction } from "wagmi";
import { useApproveERC20 } from "./useApproveERC20";
import { toast } from "react-toastify";
import { addresses } from "./config";

export const usePayLoan = ({
  payableCurrency,
  borrowerNoteId,
  repaymentController,
}) => {
  const [{ data: signer }] = useSigner();

  const { doApprove } = useApproveERC20({
    tokenAddress: payableCurrency,
    spender: repaymentController,
  });
  const repaymentContract = useContract({
    addressOrName: repaymentController,
    contractInterface: RepaymentControllerAbi,
    signerOrProvider: signer,
  });

  // eslint-disable-next-line no-unused-vars
  const [_, wait] = useWaitForTransaction({
    skip: true,
  });

  const doRepay = async () => {
    // approve repayment controller spending payable currency
    doApprove();

    console.log(`repaying with...${addresses.target.repaymentController}`);
    try {
      const { hash } = await repaymentContract.repay(borrowerNoteId);

      const waitForApproval = wait({ confirmations: 1, hash });
      const response = await toast.promise(waitForApproval, {
        pending: "Repaying...",
        success: "Repaid",
        error: "Failed to repay",
      });

      console.log({ response });
    } catch (e) {
      toast.error(e);
    }
  };

  return { doRepay };
};
