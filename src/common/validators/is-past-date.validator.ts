import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsPastDateConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!value) return true; // Allow optional fields

    // Parse the date
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return false;
    }

    const now = new Date();
    const minDate = new Date('1900-01-01');

    // Check if date is in the past and after 1900-01-01
    return date <= now && date >= minDate;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Date must be in the past and after 1900-01-01';
  }
}

export function IsPastDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPastDateConstraint,
    });
  };
}
