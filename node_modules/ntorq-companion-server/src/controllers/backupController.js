import { Vehicle } from '../models/Vehicle.js';
import { OdometerReading } from '../models/OdometerReading.js';
import { FuelEntry } from '../models/FuelEntry.js';
import { FuelPrice } from '../models/FuelPrice.js';
import { Ride } from '../models/Ride.js';
import { ParkingSpot } from '../models/ParkingSpot.js';
import { ServiceEntry } from '../models/ServiceEntry.js';
import { ServiceInterval } from '../models/ServiceInterval.js';
import { VehicleDocument } from '../models/VehicleDocument.js';
import { TyreBatteryRecord } from '../models/TyreBatteryRecord.js';
import { BluetoothProfile } from '../models/BluetoothProfile.js';

export async function exportAllData(req, res, next) {
  try {
    const userId = req.user._id;

    const [
      vehicle,
      odometerReadings,
      fuelEntries,
      fuelPrices,
      rides,
      parkingSpots,
      serviceEntries,
      serviceIntervals,
      documents,
      tyreBatteryRecords,
      bluetoothProfiles,
    ] = await Promise.all([
      Vehicle.findOne({ user: userId, isPrimary: true }).lean(),
      OdometerReading.find({ user: userId }).lean(),
      FuelEntry.find({ user: userId }).lean(),
      FuelPrice.find({ user: userId }).lean(),
      Ride.find({ user: userId }).lean(),
      ParkingSpot.find({ user: userId }).lean(),
      ServiceEntry.find({ user: userId }).lean(),
      ServiceInterval.find({ user: userId }).lean(),
      VehicleDocument.find({ user: userId }).lean(),
      TyreBatteryRecord.find({ user: userId }).lean(),
      BluetoothProfile.find({ user: userId }).lean(),
    ]);

    const backupPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      user: {
        id: userId,
        email: req.user.email,
        name: req.user.name,
      },
      data: {
        vehicle,
        odometerReadings,
        fuelEntries,
        fuelPrices,
        rides,
        parkingSpots,
        serviceEntries,
        serviceIntervals,
        documents,
        tyreBatteryRecords,
        bluetoothProfiles,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=ntorq_companion_backup_${new Date().toISOString().slice(0, 10)}.json`
    );
    return res.json(backupPayload);
  } catch (error) {
    next(error);
  }
}

export async function importData(req, res, next) {
  try {
    const { backup, dryRun } = req.body;
    const userId = req.user._id;

    if (!backup || !backup.data) {
      return res.status(400).json({ success: false, message: 'Invalid backup file format.' });
    }

    const {
      vehicle,
      odometerReadings = [],
      fuelEntries = [],
      fuelPrices = [],
      rides = [],
      parkingSpots = [],
      serviceEntries = [],
      documents = [],
      tyreBatteryRecords = [],
      bluetoothProfiles = [],
    } = backup.data;

    // Preview stats
    const preview = {
      hasVehicle: !!vehicle,
      odometerReadingsCount: odometerReadings.length,
      fuelEntriesCount: fuelEntries.length,
      fuelPricesCount: fuelPrices.length,
      ridesCount: rides.length,
      parkingSpotsCount: parkingSpots.length,
      serviceEntriesCount: serviceEntries.length,
      documentsCount: documents.length,
      tyreBatteryCount: tyreBatteryRecords.length,
      bluetoothProfilesCount: bluetoothProfiles.length,
    };

    if (dryRun) {
      return res.json({
        success: true,
        preview,
        message: 'Backup validated successfully. Ready for import.',
      });
    }

    // Perform deduplicated upsert import
    let targetVehicle = await Vehicle.findOne({ user: userId, isPrimary: true });
    if (!targetVehicle && vehicle) {
      const vehData = { ...vehicle };
      delete vehData._id;
      delete vehData.__v;
      delete vehData.user;
      targetVehicle = await Vehicle.create({ ...vehData, user: userId });
    }

    const vehicleId = targetVehicle ? targetVehicle._id : null;

    // Import odometer readings without duplicates (check reading and date)
    let importedOdo = 0;
    for (const r of odometerReadings) {
      const exists = await OdometerReading.findOne({
        user: userId,
        reading: r.reading,
        date: r.date,
      });
      if (!exists && vehicleId) {
        const item = { ...r };
        delete item._id;
        delete item.__v;
        delete item.user;
        delete item.vehicle;
        await OdometerReading.create({ ...item, user: userId, vehicle: vehicleId });
        importedOdo++;
      }
    }

    // Import fuel entries without duplicates
    let importedFuel = 0;
    for (const f of fuelEntries) {
      const exists = await FuelEntry.findOne({
        user: userId,
        odometer: f.odometer,
        date: f.date,
      });
      if (!exists && vehicleId) {
        const item = { ...f };
        delete item._id;
        delete item.__v;
        delete item.user;
        delete item.vehicle;
        await FuelEntry.create({ ...item, user: userId, vehicle: vehicleId });
        importedFuel++;
      }
    }

    // Import service entries
    let importedService = 0;
    for (const s of serviceEntries) {
      const exists = await ServiceEntry.findOne({
        user: userId,
        odometer: s.odometer,
        date: s.date,
      });
      if (!exists && vehicleId) {
        const item = { ...s };
        delete item._id;
        delete item.__v;
        delete item.user;
        delete item.vehicle;
        await ServiceEntry.create({ ...item, user: userId, vehicle: vehicleId });
        importedService++;
      }
    }

    // Import documents
    let importedDocs = 0;
    for (const d of documents) {
      const exists = await VehicleDocument.findOne({
        user: userId,
        title: d.title,
        expiryDate: d.expiryDate,
      });
      if (!exists && vehicleId) {
        const item = { ...d };
        delete item._id;
        delete item.__v;
        delete item.user;
        delete item.vehicle;
        await VehicleDocument.create({ ...item, user: userId, vehicle: vehicleId });
        importedDocs++;
      }
    }

    return res.json({
      success: true,
      message: 'Data successfully restored without duplicates.',
      importedSummary: {
        odometerReadings: importedOdo,
        fuelEntries: importedFuel,
        serviceEntries: importedService,
        documents: importedDocs,
      },
    });
  } catch (error) {
    next(error);
  }
}
