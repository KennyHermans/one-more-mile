import React, { useState } from "react";
import { ChevronDown, User, Mountain } from "lucide-react";
import { Button } from "./button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";
import { Badge } from "./badge";

interface RoleSwitcherProps {
  currentRole: 'customer' | 'sensei';
  hasCustomerProfile: boolean;
  hasSenseiProfile: boolean;
  onRoleChange: (role: 'customer' | 'sensei') => void;
  className?: string;
}

export function RoleSwitcher({ 
  currentRole, 
  hasCustomerProfile, 
  hasSenseiProfile, 
  onRoleChange,
  className = ""
}: RoleSwitcherProps) {
  // Only show role switcher if user has both profiles
  if (!hasCustomerProfile || !hasSenseiProfile) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={`${className} font-sans font-medium transition-all duration-300 hover:scale-105`}>
          {currentRole === 'sensei' ? (
            <>
              <Mountain className="w-4 h-4 mr-2" />
              Sensei Mode
            </>
          ) : (
            <>
              <User className="w-4 h-4 mr-2" />
              Customer Mode
            </>
          )}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={() => onRoleChange('customer')}
          className={currentRole === 'customer' ? 'bg-muted' : ''}
        >
          <User className="w-4 h-4 mr-2" />
          <div className="flex flex-col">
            <span>Customer Mode</span>
            <span className="text-xs text-muted-foreground">Book and manage trips</span>
          </div>
          {currentRole === 'customer' && <Badge variant="secondary" className="ml-auto">Active</Badge>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onRoleChange('sensei')}
          className={currentRole === 'sensei' ? 'bg-muted' : ''}
        >
          <Mountain className="w-4 h-4 mr-2" />
          <div className="flex flex-col">
            <span>Sensei Mode</span>
            <span className="text-xs text-muted-foreground">Lead and manage trips</span>
          </div>
          {currentRole === 'sensei' && <Badge variant="secondary" className="ml-auto">Active</Badge>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}