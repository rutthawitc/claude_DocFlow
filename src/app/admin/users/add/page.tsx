"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserForm } from "@/components/admin/user-form";
import { useEffect, useState } from "react";

export default function AddUserPage() {
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ดึงข้อมูลบทบาททั้งหมด
    const fetchRoles = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/admin/roles');
        if (!response.ok) throw new Error('Failed to fetch roles');
        
        const data = await response.json();
        setRoles(data);
      } catch (error) {
        console.error('Error fetching roles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">เพิ่มผู้ใช้งานใหม่</h1>
        <Link href="/admin/users">
          <Button variant="outline">กลับ</Button>
        </Link>
      </div>

      <div className="bg-white rounded-md shadow p-6">
        {isLoading ? (
          <p>กำลังโหลด...</p>
        ) : (
          <UserForm roles={roles} />
        )}
      </div>
    </div>
  );
}
