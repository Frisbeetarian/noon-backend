"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
const type_graphql_1 = require("type-graphql");
const typeorm_1 = require("typeorm");
const Updoot_1 = require("./Updoot");
const User_1 = require("./User");
const EventToProfile_1 = require("./EventToProfile");
let Event = class Event extends typeorm_1.BaseEntity {
};
__decorate([
    type_graphql_1.Field(() => type_graphql_1.Int),
    typeorm_1.PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], Event.prototype, "id", void 0);
__decorate([
    type_graphql_1.Field(),
    typeorm_1.Column({ unique: true }),
    __metadata("design:type", String)
], Event.prototype, "username", void 0);
__decorate([
    type_graphql_1.Field(),
    typeorm_1.Column(),
    __metadata("design:type", String)
], Event.prototype, "title", void 0);
__decorate([
    type_graphql_1.Field(),
    typeorm_1.Column(),
    __metadata("design:type", String)
], Event.prototype, "description", void 0);
__decorate([
    type_graphql_1.Field(),
    typeorm_1.Column(),
    __metadata("design:type", String)
], Event.prototype, "privacy", void 0);
__decorate([
    type_graphql_1.Field({ nullable: true, defaultValue: new Date() }),
    typeorm_1.Column(),
    __metadata("design:type", Date)
], Event.prototype, "startDate", void 0);
__decorate([
    type_graphql_1.Field({ nullable: true, defaultValue: new Date() }),
    typeorm_1.Column(),
    __metadata("design:type", Date)
], Event.prototype, "endDate", void 0);
__decorate([
    type_graphql_1.Field(),
    typeorm_1.Column(),
    __metadata("design:type", String)
], Event.prototype, "timezone", void 0);
__decorate([
    type_graphql_1.Field(),
    typeorm_1.Column(),
    __metadata("design:type", Number)
], Event.prototype, "creatorId", void 0);
__decorate([
    type_graphql_1.Field(() => User_1.User),
    typeorm_1.ManyToOne(() => User_1.User, (user) => user.events),
    __metadata("design:type", User_1.User)
], Event.prototype, "creator", void 0);
__decorate([
    typeorm_1.OneToMany(() => Updoot_1.Updoot, (updoot) => updoot.user),
    __metadata("design:type", Array)
], Event.prototype, "updoots", void 0);
__decorate([
    type_graphql_1.Field(() => EventToProfile_1.EventToProfile),
    typeorm_1.OneToMany(() => EventToProfile_1.EventToProfile, (eventToProfile) => eventToProfile.event),
    __metadata("design:type", Array)
], Event.prototype, "eventToProfiles", void 0);
__decorate([
    typeorm_1.Column({ array: true }),
    __metadata("design:type", String)
], Event.prototype, "participants", void 0);
__decorate([
    type_graphql_1.Field(() => String),
    typeorm_1.UpdateDateColumn(),
    __metadata("design:type", Date)
], Event.prototype, "updatedAt", void 0);
__decorate([
    type_graphql_1.Field(() => String),
    typeorm_1.CreateDateColumn(),
    __metadata("design:type", Date)
], Event.prototype, "createdAt", void 0);
Event = __decorate([
    type_graphql_1.ObjectType(),
    typeorm_1.Entity()
], Event);
exports.Event = Event;
//# sourceMappingURL=Event.js.map