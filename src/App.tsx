import { useState } from "react";
import { ethers } from "ethers";
import './App.css'

// 👉 这里改成你自己的红包合约地址
const CONTRACT_ADDRESS = "0x46664598500B156876782039bBB008972cBDf7b7";

// 👉 这里引入你的 ABI（Hardhat 编译产物）
import RedPacketABI from "./RedPacket.json";

export default function App() {
  const [account, setAccount] = useState<string>("");
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [message, setMessage] = useState<string>("");

  // 发红包表单
  const [amount, setAmount] = useState<string>("");
  const [shares, setShares] = useState<string>("1");
  const [expireAt, setExpireAt] = useState<string>("");

  // 抢红包表单
  const [packetId, setPacketId] = useState<string>("");

  /** 连接钱包 */
  async function connectWallet() {
    if (!window.ethereum) {
      alert("请安装 MetaMask！");
      return;
    }
    const accounts: string[] = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    setAccount(accounts[0]);

    // ethers v6
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const c = new ethers.Contract(CONTRACT_ADDRESS, RedPacketABI, signer);
    setContract(c);
    setMessage("钱包已连接");

    // 监听事件
    c.on("RedPacketCreated", (id, creator) => {
      setMessage(`🎉 红包已创建！ID: ${id.toString()}`);
    });
    c.on("RedPacketClaimed", (id, claimer, amount) => {
      setMessage(
        `💰 抢到红包！金额: ${ethers.formatEther(amount)} ETH (ID: ${id})`
      );
    });
    c.on("RedPacketExhausted", (id) => {
      setMessage(`⚠️ 红包(ID: ${id}) 已被抢完！`);
    });
  }

  /** 发红包 */
  async function createRedPacket() {
    if (!contract) return;
    try {
      const value = ethers.parseEther(amount); // ETH 转 Wei
      const tx = await contract.createRedPacket(
        Number(shares),
        Number(expireAt),
        { value }
      );
      await tx.wait();
      setMessage("✅ 发红包交易成功");
    } catch (err: any) {
      console.error(err);
      setMessage("❌ 发红包失败: " + (err.message || err));
    }
  }

  /** 抢红包 */
  async function claimRedPacket() {
    if (!contract) return;
    try {
      const tx = await contract.claim(Number(packetId));
      await tx.wait();
      setMessage("✅ 抢红包交易已提交");
    } catch (err: any) {
      console.error(err);
      if (err.errorName === "AlreadyClaimed") {
        setMessage("⚠️ 你已经抢过了");
      } else if (err.errorName === "SoldOut") {
        setMessage("⚠️ 红包抢完了");
      } else if (err.errorName === "Expired") {
        setMessage("⚠️ 红包已过期");
      } else {
        setMessage("❌ 抢红包失败: " + (err.message || err));
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-2xl font-bold mb-6">🎁 链上红包 DApp</h1>

      {/* 钱包连接 */}
      <div className="mb-4">
        {account ? (
          <span className="px-4 py-2 bg-green-500 text-white rounded">
            已连接: {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        ) : (
          <button
            onClick={connectWallet}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            连接钱包
          </button>
        )}
      </div>

      {/* 发红包 */}
      <div className="bg-white shadow-md rounded p-4 w-80 mb-6">
        <h2 className="text-lg font-semibold mb-2">发红包</h2>
        <input
          className="w-full p-2 border rounded mb-2"
          placeholder="金额 (ETH)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          className="w-full p-2 border rounded mb-2"
          placeholder="份数"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
        />
        <input
          className="w-full p-2 border rounded mb-2"
          placeholder="过期时间戳 (秒)"
          value={expireAt}
          onChange={(e) => setExpireAt(e.target.value)}
        />
        <button
          onClick={createRedPacket}
          className="w-full px-4 py-2 bg-red-500 text-white rounded"
        >
          发红包
        </button>
      </div>

      {/* 抢红包 */}
      <div className="bg-white shadow-md rounded p-4 w-80 mb-6">
        <h2 className="text-lg font-semibold mb-2">抢红包</h2>
        <input
          className="w-full p-2 border rounded mb-2"
          placeholder="红包 ID"
          value={packetId}
          onChange={(e) => setPacketId(e.target.value)}
        />
        <button
          onClick={claimRedPacket}
          className="w-full px-4 py-2 bg-green-600 text-white rounded"
        >
          抢红包
        </button>
      </div>

      {/* 提示区域 */}
      {message && (
        <div className="mt-4 p-2 bg-yellow-100 text-yellow-800 rounded">
          {message}
        </div>
      )}
    </div>
  );
}
