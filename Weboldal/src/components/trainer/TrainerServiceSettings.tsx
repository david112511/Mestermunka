import { useState } from 'react';
import { useTrainerServices } from '@/hooks/useTrainerServices';
import { Service } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Clock, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Edző szolgáltatásainak kezelése
 */
const TrainerServiceSettings = () => {
  const { services, loading, addService, updateService, deleteService } = useTrainerServices();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  // Új szolgáltatás alapértelmezett értékei
  const [newService, setNewService] = useState({
    name: '',
    duration: 60,
    price: 0,
    description: ''
  });
  
  // Új szolgáltatás hozzáadása
  const handleAddService = async () => {
    await addService(newService);
    setIsAddDialogOpen(false);
    resetNewService();
  };
  
  // Szolgáltatás szerkesztése
  const handleEditService = async () => {
    if (!selectedService) return;
    
    await updateService(selectedService.id, {
      name: selectedService.name,
      duration: selectedService.duration,
      price: selectedService.price,
      description: selectedService.description
    });
    
    setIsEditDialogOpen(false);
    setSelectedService(null);
  };
  
  // Szolgáltatás törlése
  const handleDeleteService = async () => {
    if (!selectedService) return;
    
    await deleteService(selectedService.id);
    setIsDeleteDialogOpen(false);
    setSelectedService(null);
  };
  
  // Új szolgáltatás adatainak alaphelyzetbe állítása
  const resetNewService = () => {
    setNewService({
      name: '',
      duration: 60,
      price: 0,
      description: ''
    });
  };
  
  // Szolgáltatás szerkesztésének indítása
  const startEditService = (service: Service) => {
    setSelectedService(service);
    setIsEditDialogOpen(true);
  };
  
  // Szolgáltatás törlésének indítása
  const startDeleteService = (service: Service) => {
    setSelectedService(service);
    setIsDeleteDialogOpen(true);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Szolgáltatásaim</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Új szolgáltatás
        </Button>
      </div>
      
      {loading ? (
        // Betöltés közben skeleton megjelenítése
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <div className="flex items-center">
                  <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-16 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : services.length === 0 ? (
        // Nincs szolgáltatás
        <Card className="bg-gray-50">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">Még nincs szolgáltatásod. Kattints az "Új szolgáltatás" gombra a létrehozáshoz.</p>
          </CardContent>
        </Card>
      ) : (
        // Szolgáltatások listája
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <CardTitle>{service.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>{service.duration} perc</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <span>{service.price} Ft</span>
                </div>
                {service.description && (
                  <p className="text-sm text-gray-500 mt-2">{service.description}</p>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" onClick={() => startEditService(service)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Szerkesztés
                </Button>
                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700" onClick={() => startDeleteService(service)}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Törlés
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Új szolgáltatás hozzáadása dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új szolgáltatás hozzáadása</DialogTitle>
            <DialogDescription>
              Add meg a szolgáltatás adatait. A kliensek ezek alapján tudnak időpontot foglalni.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Szolgáltatás neve</Label>
              <Input
                id="name"
                placeholder="Pl. Személyi edzés"
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Időtartam (perc)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={15}
                  step={15}
                  value={newService.duration}
                  onChange={(e) => setNewService({ ...newService, duration: parseInt(e.target.value) })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Ár (Ft)</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  value={newService.price}
                  onChange={(e) => setNewService({ ...newService, price: parseInt(e.target.value) })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Leírás (opcionális)</Label>
              <Textarea
                id="description"
                placeholder="Add meg a szolgáltatás részletes leírását..."
                value={newService.description}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              resetNewService();
            }}>
              Mégsem
            </Button>
            <Button onClick={handleAddService} disabled={!newService.name || newService.duration < 15 || newService.price < 0}>
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Szolgáltatás szerkesztése dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Szolgáltatás szerkesztése</DialogTitle>
            <DialogDescription>
              Módosítsd a szolgáltatás adatait.
            </DialogDescription>
          </DialogHeader>
          
          {selectedService && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Szolgáltatás neve</Label>
                <Input
                  id="edit-name"
                  value={selectedService.name}
                  onChange={(e) => setSelectedService({ ...selectedService, name: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-duration">Időtartam (perc)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    min={15}
                    step={15}
                    value={selectedService.duration}
                    onChange={(e) => setSelectedService({ ...selectedService, duration: parseInt(e.target.value) })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Ár (Ft)</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    min={0}
                    value={selectedService.price}
                    onChange={(e) => setSelectedService({ ...selectedService, price: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Leírás (opcionális)</Label>
                <Textarea
                  id="edit-description"
                  value={selectedService.description || ''}
                  onChange={(e) => setSelectedService({ ...selectedService, description: e.target.value })}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setSelectedService(null);
            }}>
              Mégsem
            </Button>
            <Button 
              onClick={handleEditService} 
              disabled={!selectedService || !selectedService.name || selectedService.duration < 15 || selectedService.price < 0}
            >
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Szolgáltatás törlése dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Szolgáltatás törlése</DialogTitle>
            <DialogDescription>
              Biztosan törölni szeretnéd ezt a szolgáltatást? Ez a művelet nem vonható vissza.
            </DialogDescription>
          </DialogHeader>
          
          {selectedService && (
            <div className="py-4">
              <p className="font-medium">{selectedService.name}</p>
              <div className="flex items-center text-gray-600 mt-2">
                <Clock className="h-4 w-4 mr-2" />
                <span>{selectedService.duration} perc</span>
                <DollarSign className="h-4 w-4 ml-4 mr-2" />
                <span>{selectedService.price} Ft</span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteDialogOpen(false);
              setSelectedService(null);
            }}>
              Mégsem
            </Button>
            <Button variant="destructive" onClick={handleDeleteService}>
              Törlés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainerServiceSettings;
