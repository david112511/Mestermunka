
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Dumbbell } from "lucide-react";

type UserTypeSelectionProps = {
  onSelect: (type: 'user' | 'trainer') => void;
};

export const UserTypeSelection = ({ onSelect }: UserTypeSelectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => onSelect('user')}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-6 w-6" />
            Felhasználó
          </CardTitle>
          <CardDescription>
            Regisztráljon felhasználóként, ha személyi edzőt keres vagy követni szeretné az edzési folyamatát
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">Felhasználóként folytatom</Button>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => onSelect('trainer')}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-6 w-6" />
            Személyi Edző
          </CardTitle>
          <CardDescription>
            Regisztráljon edzőként, ha szolgáltatásait szeretné kínálni és új ügyfeleket szerezni
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">Edzőként folytatom</Button>
        </CardContent>
      </Card>
    </div>
  );
};
