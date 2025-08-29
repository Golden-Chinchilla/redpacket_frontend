import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { WalletConnect } from "./WalletConnect"; // 引入你写的钱包组件
import RedPacketABI from "./RedPacket.json";

const CONTRACT_ADDRESS = "0x46664598500B156876782039bBB008972cBDf7b7";

export default function App() {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [message, setMessage] = useState<string>("");

  const [amount, setAmount] = useState("");
  const [shares, setShares] = useState("1");
  const [expireAt, setExpireAt] = useState("");
  const [packetId, setPacketId] = useState("");

  /** 初始化合约 */
  async function initContract() {
    if (!window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const c = new ethers.Contract(CONTRACT_ADDRESS, RedPacketABI, signer);
    setContract(c);

    // 事件监听
    c.on("RedPacketCreated", (id) => {
      setMessage(`🎉 红包已创建！ID: ${id.toString()}`);
    });
    c.on("RedPacketClaimed", (id, claimer, amount) => {
      setMessage(`💰 抢到红包: ${ethers.formatEther(amount)} ETH (ID: ${id})`);
    });
    c.on("RedPacketExhausted", (id) => {
      setMessage(`⚠️ 红包(ID: ${id}) 已抢完`);
    });
  }

  useEffect(() => {
    initContract();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => {
        initContract();
      });
      window.ethereum.on("chainChanged", () => {
        initContract();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", initContract);
        window.ethereum.removeListener("chainChanged", initContract);
      }
    };
  }, []);


  /** 发红包 */
  async function createRedPacket() {
    if (!contract) return;
    try {
      const value = ethers.parseEther(amount);
      const tx = await contract.createRedPacket(
        Number(shares),
        Number(expireAt),
        { value }
      );
      await tx.wait();
      setMessage("✅ 发红包交易成功");
    } catch (err: any) {
      setMessage("❌ 发红包失败: " + err.message);
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
      if (err.errorName === "AlreadyClaimed") setMessage("⚠️ 你已经抢过了");
      else if (err.errorName === "SoldOut") setMessage("⚠️ 红包抢完了");
      else if (err.errorName === "Expired") setMessage("⚠️ 红包已过期");
      else setMessage("❌ 抢红包失败: " + err.message);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* 使用你写的钱包组件 */}
      <WalletConnect />

      {/* 发红包 */}
      <div className="bg-white p-4 rounded shadow w-80">
        <h2 className="font-bold mb-2">发红包</h2>
        <input className="border p-2 w-full mb-2" placeholder="金额(ETH)"
          value={amount} onChange={e => setAmount(e.target.value)} />
        <input className="border p-2 w-full mb-2" placeholder="份数"
          value={shares} onChange={e => setShares(e.target.value)} />
        <input className="border p-2 w-full mb-2" placeholder="过期时间戳"
          value={expireAt} onChange={e => setExpireAt(e.target.value)} />
        <button onClick={createRedPacket}
          className="bg-red-500 text-white px-4 py-2 rounded w-full">发红包</button>
      </div>

      {/* 抢红包 */}
      <div className="bg-white p-4 rounded shadow w-80">
        <h2 className="font-bold mb-2">抢红包</h2>
        <input className="border p-2 w-full mb-2" placeholder="红包ID"
          value={packetId} onChange={e => setPacketId(e.target.value)} />
        <button onClick={claimRedPacket}
          className="bg-green-500 text-white px-4 py-2 rounded w-full">抢红包</button>
      </div>

      {message && <div className="p-2 bg-yellow-100 rounded">{message}</div>}
    </div>
  );
}
