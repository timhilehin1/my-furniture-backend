Pretty innteresting stuff so far, one thing i have particularly learnt is  that what lives insidetables are business models
I like idea of middlewares mehn, protect your routes, protect your handlers
you can extend the error class of a framework/ package, interesting so we are building our own error class, extending the base class and adding our error class
I CAN HAVE MULTIPLE INSTANCES of my base class, so the arguments in the calss, inside the constrcutor are what we use to define properties of that calss,
so something like
class car{
    constructor (public color:string){

    }
}
so when we are saying use Inheritannce, we are not necessarily saying that we should do away with the base class, we are saying use this base class as a template ad build upon it, slightly different than objects tbh - Inheritance

class Truck extends Car {
    constructor(color:string, publictowingcapacity:number){
        super(color)
    }
}
constructor is responsible for initializing the instancce of the class, that is why it receives argument and class super that says okay o, you can also build from the parent class, okay fairs, that's why we can get name from constructor.name
fastify is still like the major base guy
debugged profile endpoint successfully, really feel good about this
brrrrr jwt is nt fully sorted cuz i am catching the error in two places
only one user can have one cart, one to one
multiple carts can belong to one user = many to one
with zod you can use it to generate types from schema, instead of writing schemas then creating interfaces separately
ORMs - Prisma - It is excellent, wow