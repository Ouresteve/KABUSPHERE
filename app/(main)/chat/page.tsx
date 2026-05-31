'use client';

import { Search, Send, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

export default function ChatPage() {
  const [selectedChat, setSelectedChat] = useState<number | null>(null);

  const chats = [
    { id: 1, name: "Jane Mwangi", role: "Laptop Seller", lastMsg: "Is the laptop still available?", time: "2m" },
    { id: 2, name: "Hostel Laundry", role: "Service Provider", lastMsg: "Your clothes will be ready by 5pm", time: "1h" },
    { id: 3, name: "Peter Kimani", role: "Buyer", lastMsg: "Can you accept 22k?", time: "Yesterday" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col h-screen">
      
      {/* Header */}
      <div className="bg-white border-b z-50 px-4 py-4 sticky top-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#001533]">Messages</h1>
          <Search className="w-5 h-5 text-gray-600" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Chat List */}
        <div className={`w-full md:w-96 border-r bg-white ${selectedChat ? 'hidden md:block' : 'block'}`}>
          <div className="divide-y">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat.id)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition ${selectedChat === chat.id ? 'bg-blue-50' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-[#001533]">{chat.name}</p>
                    <p className="text-sm text-gray-600">{chat.role}</p>
                  </div>
                  <p className="text-xs text-gray-500">{chat.time}</p>
                </div>
                <p className="text-gray-700 mt-1 line-clamp-1 text-[15px]">{chat.lastMsg}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
          
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
                <button 
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden p-2 -ml-2"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-700" />
                </button>
                <div>
                  <p className="font-semibold text-[#001533]">Jane Mwangi</p>
                  <p className="text-sm text-green-600 font-medium">Online</p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto bg-[#F8FAFC] space-y-4">
                <div className="bg-white text-gray-800 p-4 rounded-3xl rounded-bl-none max-w-[80%]">
                  Hi, is the laptop still available?
                </div>

                <div className="bg-[#0047B3] text-white p-4 rounded-3xl rounded-br-none max-w-[80%] ml-auto">
                  Yes it is. Are you interested?
                </div>
              </div>

              {/* Message Input */}
              <div className="bg-white border-t p-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-100 border border-transparent focus:border-[#0047B3] rounded-2xl px-5 py-3.5 focus:outline-none text-gray-800 placeholder:text-gray-500"
                  />
                  <button className="bg-[#0047B3] text-white p-4 rounded-2xl">
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
}