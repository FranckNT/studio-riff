export class DomainError extends Error {
    constructor(message, code) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
    }
}
export class ValidationError extends DomaineError {} 
export class NotFoundError extends DomainError {}
export class ConflictError extends DomainError {}